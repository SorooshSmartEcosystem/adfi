// Video agent — turns a content brief into a multi-scene VideoScript
// the @orb/motion-reel renderer plays as a sequence.
//
// Cost notes (see SKILL.md for full breakdown):
//   - Uses HAIKU 4.5 ($1/$5 per M tokens) — scriptwriting from a
//     fully-specified brief is well within Haiku's range and 5× cheaper
//     than Sonnet.
//   - System prompt is marked `cache_control: ephemeral` so the long
//     scene-catalog block (~3-4k tokens) gets cached across calls.
//     Cache hits are 10% the price of regular input.
//   - Per-video target: ~0.4¢ on cache hit, ~1.2¢ on cache miss.

import { z } from "zod";
import { Agent } from "@orb/db";
import {
  anthropic,
  jsonSchemaForAnthropic,
  MODELS,
  recordAnthropicUsage,
} from "../services/anthropic";
import { detectLanguage } from "./language";
import type { BrandVoice } from "./strategist";

// ------------------- Schema -------------------

// Each scene shape must match @orb/motion-reel/types.ts. Replicated
// here as Zod for runtime validation + Anthropic schema constraint.

const HookSceneSchema = z.object({
  type: z.literal("hook"),
  headline: z.string().min(1).max(40),
  subtitle: z.string().max(120).optional(),
  duration: z.number().min(2).max(6),
});

const StatSceneSchema = z.object({
  type: z.literal("stat"),
  value: z.union([z.number(), z.string()]),
  prefix: z.string().max(8).optional(),
  suffix: z.string().max(8).optional(),
  label: z.string().min(2).max(40),
  duration: z.number().min(2).max(5),
});

// Contrast values are visually big — the renderer fits them inside a
// half-screen card. 40 chars is the practical ceiling before they
// wrap awkwardly. Haiku occasionally emits 22-30 char values like
// "$3,500/month" which we'd rather render slightly truncated than
// reject outright; the .transform trims anything past the cap.
const trim = (max: number) =>
  z
    .string()
    .min(1)
    .transform((s) => (s.length > max ? s.slice(0, max) : s));

const ContrastSceneSchema = z.object({
  type: z.literal("contrast"),
  leftLabel: trim(40),
  leftValue: trim(40),
  rightLabel: trim(40),
  rightValue: trim(40),
  caption: z
    .string()
    .max(200)
    .transform((s) => (s.length > 160 ? s.slice(0, 160) : s))
    .optional(),
  duration: z.number().min(2).max(5),
});

const QuoteSceneSchema = z.object({
  type: z.literal("quote"),
  quote: z.string().min(20).max(200),
  emphasis: z.string().max(40).optional(),
  attribution: z.string().max(80).optional(),
  duration: z.number().min(3).max(6),
});

const PunchlineSceneSchema = z.object({
  type: z.literal("punchline"),
  line: z.string().min(8).max(140),
  emphasis: z.string().max(40).optional(),
  duration: z.number().min(2).max(5),
});

const ListSceneSchema = z.object({
  type: z.literal("list"),
  title: z.string().min(4).max(80),
  items: z
    .array(
      z.object({
        headline: z.string().min(2).max(60),
        body: z.string().max(120).optional(),
      }),
    )
    .min(2)
    .max(4),
  duration: z.number().min(4).max(8),
});

const HashtagSceneSchema = z.object({
  type: z.literal("hashtags"),
  hashtags: z.array(z.string().min(2).max(40)).min(3).max(8),
  caption: z.string().max(120).optional(),
  duration: z.number().min(2).max(4),
});

const BrandStampSceneSchema = z.object({
  type: z.literal("brand-stamp"),
  cta: z.string().max(120).optional(),
  duration: z.number().min(2).max(4),
});

const SceneSchema = z.discriminatedUnion("type", [
  HookSceneSchema,
  StatSceneSchema,
  ContrastSceneSchema,
  QuoteSceneSchema,
  PunchlineSceneSchema,
  ListSceneSchema,
  HashtagSceneSchema,
  BrandStampSceneSchema,
]);

const VideoDesignSchema = z.object({
  style: z.enum(["minimal", "bold", "warm", "editorial"]),
  accent: z.enum(["alive", "attn", "urgent", "ink"]),
  pace: z.enum(["slow", "medium", "fast"]),
  statusLabel: z.string().min(2).max(40),
  hookLabel: z.string().min(2).max(40),
  metaLabel: z.string().min(2).max(40),
  closerLabel: z.string().min(2).max(40),
});

const VideoScriptSchema = z.object({
  scenes: z.array(SceneSchema).min(3).max(8),
  design: VideoDesignSchema,
});

export type VideoScript = z.infer<typeof VideoScriptSchema>;

// ------------------- System prompt -------------------
// Written like a scriptwriting brief. Long but cached — only paid for
// once per cache window (Anthropic caches for 5 min by default).
const VIDEO_SYSTEM_PROMPT = `You are ADFI's video agent. You turn a content brief into a SCRIPT
of 3-7 scenes that play back-to-back as a vertical short-form reel
(Instagram Reels, TikTok, YouTube Shorts, 1080×1920).

You're a scriptwriter, not a copywriter. Decompose the brief into
narrative beats. Each scene is one beat. Total length 12-25 seconds.

==============================================================
SCENE TYPES
==============================================================

1. hook — Stop-scroll opener. ONE big number, word, or short phrase
   that fills the frame.
   { type: "hook", headline: string, subtitle?: string, duration }
   - headline ≤ 40 chars. Smaller is more punchy. "$4.2k", "51%",
     "WRONG", "DAY 1" all work.
   - subtitle: one-line clarifier, ≤120 chars.
   - duration: 2-3s typical. The first scene is ALWAYS hook unless
     the brief is genuinely just a quote.

2. stat — Single labeled metric with animated counter.
   { type: "stat", value: number|string, prefix?, suffix?, label, duration }
   - value: numeric (animates from 0) or pre-formatted string ("4.2k").
   - label: uppercase mono caption above. e.g. "PROFITABLE TRADERS".
   - duration: 2-3s.

3. contrast — Two-up A vs B comparison.
   { type: "contrast", leftLabel, leftValue, rightLabel, rightValue,
     caption?, duration }
   - left side is the focal/positive; right side is the comparison.
   - values are short strings (≤40 chars). Punchier is better — "51%"
     beats "fifty-one percent". Single phrase, no full sentences.
   - caption: optional one-liner under both sides ≤160 chars.

4. quote — Pull quote with word-by-word reveal.
   { type: "quote", quote, emphasis?, attribution?, duration }
   - quote ≤200 chars. Two sentences max.
   - emphasis: optional word/phrase from the quote. (Visual emphasis
     is reserved for punchline scenes, but the agent should still
     surface this hint when it picks one.)
   - duration: 3-5s.

5. punchline — The line that lands. One sentence, often with a key
   word emphasized.
   { type: "punchline", line, emphasis?, duration }
   - line ≤140 chars. ONE idea.
   - emphasis: the key word. Renderer color-shifts + bolds it.
   - duration: 3-4s.

6. list — Numbered enumeration. 2-4 items.
   { type: "list", title, items: [{headline, body?}], duration }
   - title ≤80 chars.
   - items: 2-4 entries. headlines punchy (4-6 words). body optional.
   - duration: 5-7s for 3 items.

7. hashtags — Tag cloud + optional CTA caption.
   { type: "hashtags", hashtags: string[], caption?, duration }
   - 3-8 tags. With or without "#" prefix.
   - caption: one-line CTA above. Optional.
   - duration: 2-3s. Always near the end.

8. brand-stamp — Closer. Brand mark + business name + optional CTA.
   { type: "brand-stamp", cta?, duration }
   - cta: short CTA pill. e.g. "DM 'feed' for the list".
   - duration: 2-3s. ALWAYS the last scene.

==============================================================
SCRIPT STRUCTURE
==============================================================

A good 18-22s script for a content post:
  [hook → 1-2 supporting scenes → punchline → brand-stamp]

A "tips" / "list" post:
  [hook → list → punchline → brand-stamp]

A stat-driven post:
  [hook (with the stat) → contrast OR supporting stat → punchline →
   brand-stamp]

A pure inspirational quote:
  [quote → brand-stamp] — 2 scenes is fine if that's truly the post.

ALWAYS end with brand-stamp. ALWAYS start with a stop-scroll beat
(hook or quote).

==============================================================
DESIGN KNOBS (set ONCE for the whole script)
==============================================================

Style: minimal | bold | warm | editorial
  Match the brand:
  - ceramics / craft / food / family → warm
  - legal / financial / wellness / luxury → minimal
  - fitness / sports / youth / sales / crypto → bold
  - design / architecture / fashion → editorial

Accent: alive | attn | urgent | ink
  - alive (green): growth, good news, default for stats trending up
  - attn (amber): caution, opportunity, urgency, sale, deadline
  - urgent (red): stop-scroll, problem, mistake-to-avoid
  - ink (mono): no accent — most editorial

Pace: slow | medium | fast
  - slow: meditative quotes, wellness brands
  - medium: most posts (default)
  - fast: stat reels, sports/youth, sales/launches

Mono labels (uppercase). Match brand voice:
  - statusLabel: top-of-screen status. "TODAY'S NOTE",
    "MORNING THOUGHT", "WEEKLY UPDATE", "BIG NEWS".
  - hookLabel: card 1 mono header. "WHY WE STARTED", "ON HONEST WORK".
  - metaLabel: card 2 mono header. "BACKSTORY", "WHY IT MATTERS".
  - closerLabel: closer mono header. "SHARE THIS", "TAG SOMEONE",
    "MORE COMING".

==============================================================
VOICE
==============================================================

- Match the user's brand voice (tone, pillars). Echo of the brief.
- Lowercase if the brand uses lowercase.
- Don't add punctuation flourishes the brand wouldn't use.
- Don't sound like ad copy. Sound like the founder talking.

==============================================================
LANGUAGE
==============================================================

Match the brief's language. Mono labels too — no English fallback.
If the brief is in Farsi, every string in your output is in Farsi.

==============================================================
OUTPUT
==============================================================

Strict JSON matching the schema. Every scene has type + duration.
Every design field required. No prose around the JSON.`;

// ------------------- Public API -------------------
export type VideoAgentInput = {
  brief: string;
  brandVoice?: BrandVoice | null;
  businessName?: string;
  // Industry hint, e.g. "ceramics studio" / "fitness coach". Helps the
  // agent pick design knobs. Often absent — agent infers from voice.
  industry?: string;
  userId?: string;
};

export async function runVideoAgent(args: VideoAgentInput): Promise<VideoScript> {
  const lang = detectLanguage(args.brief);
  const langDirective =
    lang.code === "en"
      ? ""
      : `\n\n=== LANGUAGE LOCK ===\nThe brief above is in ${lang.label}. EVERY string in your output — every scene field, every mono label, every CTA — MUST be in ${lang.label}. No English. No transliteration.`;

  const voiceBlock = args.brandVoice
    ? `\n\nBrand voice (match its tone + pillars):\n${JSON.stringify(args.brandVoice, null, 2)}`
    : "";
  const businessBlock = args.businessName
    ? `\n\nBusiness name: ${args.businessName}`
    : "";
  const industryBlock = args.industry ? `\n\nIndustry: ${args.industry}` : "";

  const userMessage = `Content brief:\n${args.brief}${voiceBlock}${businessBlock}${industryBlock}${langDirective}`;

  const response = await anthropic().messages.create({
    // Haiku is plenty for structured scriptwriting from a fully-
    // specified brief. ~5× cheaper than Sonnet, ~25× cheaper than Opus.
    model: MODELS.HAIKU,
    max_tokens: 2500,
    system: [
      {
        type: "text",
        text: VIDEO_SYSTEM_PROMPT,
        // Cache the long system prompt — agent calls within a 5-min
        // window pay 10% the input price for cached tokens.
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
    output_config: {
      format: {
        type: "json_schema",
        schema: jsonSchemaForAnthropic(VideoScriptSchema),
      },
    },
  });

  if (args.userId) {
    void recordAnthropicUsage({
      userId: args.userId,
      agent: Agent.ECHO,
      eventType: "video_script_generated",
      response,
    });
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error(
      `video agent returned no text (stop_reason: ${response.stop_reason})`,
    );
  }

  const raw = JSON.parse(textBlock.text);
  return VideoScriptSchema.parse(raw);
}
