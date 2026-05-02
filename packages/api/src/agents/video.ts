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
//
// Every string field uses `trim(max)` instead of `.max()` so Haiku's
// occasional overruns get truncated instead of crashing the whole
// generation. The agent prompt still teaches the recommended caps
// (the system prompt below), and the LLM mostly stays within them —
// but when it doesn't, we'd rather render a slightly truncated
// headline than dead-end the user with a Zod error.

const trim = (max: number) =>
  z
    .string()
    .min(1)
    .transform((s) => (s.length > max ? s.slice(0, max) : s));

// Same as trim, but allows empty strings (for fields where Haiku
// occasionally returns "" — quote attribution, etc.).
const trimOpt = (max: number) =>
  z
    .string()
    .transform((s) => (s.length > max ? s.slice(0, max) : s));

// Curated icon names. Mirrors `motion-reel/src/icons/index.ts`. Kept
// as a literal union here so the agent's structured-output schema
// constrains the model to the exact names we ship; an unrecognised
// name would otherwise fall through to "no icon" silently.
const IconNameZ = z.enum([
  "dollar",
  "percent",
  "trending-up",
  "trending-down",
  "chart-bar",
  "chart-line",
  "coin",
  "wallet",
  "credit-card",
  "bank",
  "rocket",
  "target",
  "sparkle",
  "lightbulb",
  "alert",
  "fire",
  "lightning",
  "check",
  "x",
  "heart",
  "message",
  "share",
  "users",
  "bookmark",
  "globe",
  "clock",
  "calendar",
  "mail",
  "phone",
  "lock",
  "shield",
  "search",
  "star",
  "play",
  "pause",
  "arrow-right",
  "arrow-up",
  "arrow-down",
]);

const HookSceneSchema = z.object({
  type: z.literal("hook"),
  headline: trim(60),
  subtitle: trimOpt(180).optional(),
  icon: IconNameZ.optional(),
  duration: z.number().min(2).max(6),
});

const StatSceneSchema = z.object({
  type: z.literal("stat"),
  value: z.union([z.number(), z.string()]),
  prefix: trimOpt(16).optional(),
  suffix: trimOpt(16).optional(),
  label: trim(60),
  icon: IconNameZ.optional(),
  duration: z.number().min(2).max(5),
});

const DataBarSceneSchema = z.object({
  type: z.literal("data-bar"),
  title: trimOpt(80).optional(),
  bars: z
    .array(
      z.object({
        label: trim(40),
        value: z.union([z.number(), z.string()]),
        prefix: trimOpt(8).optional(),
        suffix: trimOpt(8).optional(),
      }),
    )
    .min(2)
    .max(5),
  caption: trimOpt(180).optional(),
  duration: z.number().min(3).max(8),
});

const ContrastSceneSchema = z.object({
  type: z.literal("contrast"),
  leftLabel: trim(60),
  leftValue: trim(60),
  rightLabel: trim(60),
  rightValue: trim(60),
  caption: trimOpt(200).optional(),
  duration: z.number().min(2).max(5),
});

const QuoteSceneSchema = z.object({
  type: z.literal("quote"),
  quote: trim(280),
  emphasis: trimOpt(60).optional(),
  attribution: trimOpt(120).optional(),
  duration: z.number().min(3).max(6),
});

const PunchlineSceneSchema = z.object({
  type: z.literal("punchline"),
  line: trim(200),
  emphasis: trimOpt(60).optional(),
  duration: z.number().min(2).max(5),
});

const ListSceneSchema = z.object({
  type: z.literal("list"),
  title: trim(120),
  items: z
    .array(
      z.object({
        headline: trim(80),
        body: trimOpt(180).optional(),
      }),
    )
    .min(2)
    .max(6),
  duration: z.number().min(4).max(8),
});

const HashtagSceneSchema = z.object({
  type: z.literal("hashtags"),
  hashtags: z.array(trim(60)).min(2).max(10),
  caption: trimOpt(180).optional(),
  duration: z.number().min(2).max(4),
});

const BrandStampSceneSchema = z.object({
  type: z.literal("brand-stamp"),
  cta: trimOpt(180).optional(),
  duration: z.number().min(2).max(4),
});

// ─────────────────────────────────────────────────────────────────
// editorial-bold preset scenes (Phase 2)
// ─────────────────────────────────────────────────────────────────

const BoldStatementSchema = z.object({
  type: z.literal("bold-statement"),
  lead: trimOpt(80).optional(),
  hero: trim(120),
  emphasis: trimOpt(40).optional(),
  trail: trimOpt(80).optional(),
  duration: z.number().min(2).max(6),
});

const IconListSchema = z.object({
  type: z.literal("icon-list"),
  title: trimOpt(80).optional(),
  items: z
    .array(
      z.object({
        icon: IconNameZ,
        label: trim(40),
      }),
    )
    .min(3)
    .max(6),
  highlightIndex: z.number().int().min(0).max(5).optional(),
  duration: z.number().min(3).max(7),
});

const NumberedDiagramSchema = z.object({
  type: z.literal("numbered-diagram"),
  title: trimOpt(60).optional(),
  center: trim(48),
  callouts: z
    .array(
      z.object({
        label: trim(60),
      }),
    )
    .min(2)
    .max(3),
  duration: z.number().min(3).max(6),
});

const EditorialOpenerSchema = z.object({
  type: z.literal("editorial-opener"),
  motif: IconNameZ.optional(),
  headline: trim(140),
  emphasis: trimOpt(40).optional(),
  duration: z.number().min(2).max(5),
});

const EditorialClosingSchema = z.object({
  type: z.literal("editorial-closer"),
  motif: IconNameZ.optional(),
  cta: trimOpt(120).optional(),
  duration: z.number().min(2).max(4),
});

const SceneSchema = z.discriminatedUnion("type", [
  HookSceneSchema,
  StatSceneSchema,
  DataBarSceneSchema,
  ContrastSceneSchema,
  QuoteSceneSchema,
  PunchlineSceneSchema,
  ListSceneSchema,
  HashtagSceneSchema,
  BrandStampSceneSchema,
  // editorial-bold preset
  BoldStatementSchema,
  IconListSchema,
  NumberedDiagramSchema,
  EditorialOpenerSchema,
  EditorialClosingSchema,
]);

const VideoDesignSchema = z.object({
  style: z.enum(["minimal", "bold", "warm", "editorial"]),
  accent: z.enum(["alive", "attn", "urgent", "ink"]),
  pace: z.enum(["slow", "medium", "fast"]),
  statusLabel: trim(60),
  hookLabel: trim(60),
  metaLabel: trim(60),
  closerLabel: trim(60),
});

const PresetNameZ = z.enum([
  "editorial-bold",
  "dashboard-tech",
  "soft-minimal",
  "luxury",
  "studio-craft",
  "documentary",
  "generic",
]);

const VideoScriptSchema = z.object({
  scenes: z.array(SceneSchema).min(3).max(8),
  design: VideoDesignSchema,
  preset: PresetNameZ.optional(),
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
   { type: "stat", value: number|string, prefix?, suffix?, label,
     icon?, duration }
   - value: numeric (animates from 0) or pre-formatted string ("4.2k").
   - prefix: a CURRENCY OR UNIT MARK ONLY. Valid: "$", "€", "£", "+",
     "-", "~". One or two characters max. NOT a description, NOT
     context. WRONG: "approximately", "into crypto ETPs", "of users".
   - suffix: a UNIT OR ABBREVIATION MARK ONLY. Valid: "%", "x", "k",
     "M", "B", "/mo", "ºC", " hrs". 1–4 characters max. NOT a
     description. WRONG: "into crypto ETPs", "of customers", "users".
     If the brief needs descriptive context, put it in the LABEL
     instead, or use a punchline scene.
   - label: uppercase mono caption above. e.g. "PROFITABLE TRADERS",
     "WEEKLY ACTIVE USERS", "INTO CRYPTO ETPs".
   - icon: optional icon name (see ICON LIBRARY below).
   - duration: 2-3s.

3. data-bar — Animated horizontal bar chart for COMPARISON data.
   { type: "data-bar", title?, bars: [{label, value, prefix?, suffix?}],
     caption?, duration }
   - 2–5 bars. Each bar has its own label + value. Renderer normalizes
     the largest as 100% and scales the others proportionally.
   - Use when you have multiple comparable numbers from the brief
     (e.g. "Bitcoin $48B, Ether $12B, Solana $4B"). Replaces a stat
     scene that would have crammed multiple data points into one.
   - title: optional uppercase mono header above the bars.
   - caption: optional one-liner under the chart.
   - duration: 4-6s typical so each bar has time to grow.

4. contrast — Two-up A vs B comparison.
   { type: "contrast", leftLabel, leftValue, rightLabel, rightValue,
     caption?, duration }
   - left side is the focal/positive; right side is the comparison.
   - values are short strings (≤40 chars). Punchier is better — "51%"
     beats "fifty-one percent". Single phrase, no full sentences.
   - caption: optional one-liner under both sides ≤160 chars.

5. quote — Pull quote with word-by-word reveal.
   { type: "quote", quote, emphasis?, attribution?, duration }
   - quote ≤200 chars. Two sentences max.
   - emphasis: optional word/phrase from the quote. (Visual emphasis
     is reserved for punchline scenes, but the agent should still
     surface this hint when it picks one.)
   - duration: 3-5s.

6. punchline — The line that lands. One sentence, often with a key
   word emphasized.
   { type: "punchline", line, emphasis?, duration }
   - line ≤140 chars. ONE idea.
   - emphasis: the key word. Renderer color-shifts + bolds it.
   - duration: 3-4s.

7. list — Numbered enumeration. 2-4 items.
   { type: "list", title, items: [{headline, body?}], duration }
   - title ≤80 chars.
   - items: 2-4 entries. headlines punchy (4-6 words). body optional.
   - duration: 5-7s for 3 items.

8. hashtags — Tag cloud + optional CTA caption.
   { type: "hashtags", hashtags: string[], caption?, duration }
   - 3-8 tags. With or without "#" prefix.
   - caption: one-line CTA above. Optional.
   - duration: 2-3s. Always near the end.

9. brand-stamp — Closer. Brand mark + business name + optional CTA.
   { type: "brand-stamp", cta?, duration }
   - cta: short CTA pill. e.g. "DM 'feed' for the list".
   - duration: 2-3s. ALWAYS the last scene.

==============================================================
EDITORIAL-BOLD PRESET SCENES (preferred default)
==============================================================

The 5 scenes below are the editorial-bold preset's catalog. They
produce reels in the visual style of strong founder/business
content: white background, heavy black display type, one accent
color for emphasis, recurring brand motif as continuity glyph,
generous whitespace.

PREFER these over the legacy hook/stat/quote/punchline scenes for
any reel where the brand voice is confident, sharp, opinionated, or
educational. Use the legacy scenes as fallback only.

10. editorial-opener — The opening beat. A small recurring brand
    motif at the top casts an accent-colored spotlight beam toward
    the headline below. Used as scene 1.
    { type: "editorial-opener", motif?, headline, emphasis?, duration }
    - motif: an icon name from the ICON LIBRARY. Pick ONE icon that
      represents the brand or topic — that same icon MUST appear in
      the editorial-closer for continuity. e.g. "lightbulb",
      "target", "trending-up", "sparkle".
    - headline: the opening statement. 2-8 words ideal. Mixed-weight
      composition.
    - emphasis: ONE word from headline to colorize as the accent
      punchline. The most important word.
    - duration: 2-3s.

11. bold-statement — The workhorse body scene. Mixed-weight
    composition: small lead phrase at top, HUGE heavy display
    statement, optional small trailing phrase. ONE word in the
    statement gets the accent color (the punchline).
    { type: "bold-statement", lead?, hero, emphasis?, trail?, duration }
    - lead: optional small phrase at top, ≤40 chars. Sets context.
      e.g. "Most" or "The truth is".
    - hero: the big statement. 2-8 words. Required.
      e.g. "billion-dollar companies looked stupid".
    - emphasis: optional word from hero to highlight in accent color.
      Default: last word.
    - trail: optional small phrase at bottom, ≤40 chars.
    - duration: 3-5s. The scene needs time to breathe.

12. icon-list — Vertical pillar list with circle icons. 3-6 entries
    each with an icon + label. Used for "X principles", "X reasons",
    "X benefits" content.
    { type: "icon-list", title?, items: [{icon, label}], highlightIndex?, duration }
    - title: optional uppercase header above the list, ≤80 chars.
    - items: 3-6 entries. Each must specify an icon name from the
      ICON LIBRARY plus a short label (≤40 chars).
    - highlightIndex: optional 0-indexed row to highlight with an
      accent panel. Use sparingly — at most one row per scene.
    - duration: 4-7s. More items needs more time.

13. numbered-diagram — Concept diagram with 2-3 numbered callouts
    pointing at a center concept. Used for explainers where the
    argument has a clear structure ("two things matter", "three
    forces", etc).
    { type: "numbered-diagram", title?, center, callouts: [{label}], duration }
    - title: optional header above the diagram.
    - center: the central concept the callouts point at.
      ≤24 chars displays cleanly.
    - callouts: 2-3 entries. Each is a short label (≤60 chars).
      Order matters — callout 1 is top-right, 2 is bottom-right,
      3 is bottom-left.
    - duration: 4-6s.

14. editorial-closer — The closing beat. Brand motif sits at the
    center, business name in heavy display type below, optional CTA
    pill. ALWAYS last scene when using editorial-bold preset.
    { type: "editorial-closer", motif?, cta?, duration }
    - motif: SAME icon name as the editorial-opener. Continuity glyph.
    - cta: optional CTA pill. ≤80 chars.
    - duration: 2-3s.

Editorial-bold composition arc:
  scene 1: editorial-opener  (mark + spotlight + headline)
  scenes 2..N-1: bold-statement, icon-list, numbered-diagram, or any
                 mix of those (avoid same scene type twice in a row)
  scene N: editorial-closer  (mark + business name + CTA)

==============================================================
ICON LIBRARY
==============================================================

Hook and stat scenes accept an optional "icon" field. Pick ONE name
from the curated set below per scene, ONLY when the topic is a clean
match. If nothing fits, omit the field — empty space is better than
a wrong icon.

Pick by topic:

  finance / commerce → dollar, percent, trending-up, trending-down,
                       chart-bar, chart-line, coin, wallet,
                       credit-card, bank
  growth / momentum  → rocket, target, sparkle, lightbulb, star,
                       trending-up
  alert / urgency    → alert, fire, lightning, x
  status / outcome   → check, x
  social / community → heart, message, share, users, bookmark
  comms / contact    → mail, phone, message
  time / planning    → clock, calendar
  trust / safety     → lock, shield
  navigation / cta   → arrow-right, arrow-up, arrow-down, play, search
  global / reach     → globe

Picking rules:
- Match the SCENE subject, not the brand. A pottery studio's
  "$2,400 in sales" stat scene uses "dollar", not "coin".
- Only one icon per scene. The hook icon, if used, sits as a ghost
  backdrop; the stat icon sits small above the label.
- If the brief is poetic / abstract / a quote, omit the icon.
- Don't pick an icon just to fill space — a blank scene is
  intentional and reads as confident.

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
GROUNDING — DO NOT INVENT FACTS
==============================================================

You write the SCRIPT, not the data. Every specific number, dollar
amount, percentage, year, ticker, brand name, and proper noun in your
output MUST come from the brief. If the brief doesn't contain a
specific number, do not invent one — restructure the scene to use a
qualitative claim instead.

WRONG (invented "$46.7B" and "2025" — neither was in the brief):
  brief: "Crypto ETF inflows are huge"
  scene: { type: "stat", value: "$46.7B", label: "INTO CRYPTO ETFs IN 2025" }

RIGHT (qualitative — no fabricated number):
  brief: "Crypto ETF inflows are huge"
  scene: { type: "punchline", line: "crypto ETFs broke every inflow record this cycle." }

If the brief contains a phrase like "we hit $50K in February", you may
quote that exact figure verbatim in a stat scene. Otherwise pick a
hook + punchline + brand-stamp arc with no numbers.

Spelling: copy proper nouns and tickers from the brief verbatim.
ETFs are "ETFs" not "ETPs". Bitcoin is "Bitcoin" not "BTC" unless the
brief uses the abbreviation. Brand names match the casing in the
brief.

Dates: do not invent a year. If the brief is undated, write in
present tense ("this week", "right now", "today") instead of naming
a year.

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

// ------------------- Preset picker (mirrors motion-reel/presets/pickPreset) -------------------
// Local copy because @orb/motion-reel imports React-Remotion which
// can't be loaded server-side at this point in the API package.
// Keep in sync with packages/motion-reel/src/presets/pickPreset.ts.

function pickPresetForBrief(args: {
  industry?: string | null;
  brandVoice?: string | null;
}): string {
  const text = [args.industry ?? "", args.brandVoice ?? ""]
    .join(" ")
    .toLowerCase();
  if (!text.trim()) return "editorial-bold";

  // Until other presets ship, every match maps to editorial-bold.
  // The branches stay so future presets can plug in by replacing the
  // return value.
  if (
    /\b(fintech|finance|crypto|trading|invest|saas|software|developer|api|data|analytics)\b/.test(
      text,
    )
  ) {
    return "editorial-bold"; // future: dashboard-tech
  }
  if (
    /\b(wellness|yoga|meditation|coach|coaching|therap|mindful|family|parent)\b/.test(
      text,
    )
  ) {
    return "editorial-bold"; // future: soft-minimal
  }
  if (
    /\b(luxury|fashion|jewel|hotel|resort|fine dining|interior|architect)\b/.test(
      text,
    )
  ) {
    return "editorial-bold"; // future: luxury
  }
  if (
    /\b(pottery|ceramic|craft|handmade|maker|woodwork|baker|chef|artisan)\b/.test(
      text,
    )
  ) {
    return "editorial-bold"; // future: studio-craft
  }
  if (/\b(education|teach|tutor|news|journal|history|nonprofit)\b/.test(text)) {
    return "editorial-bold"; // future: documentary
  }
  return "editorial-bold";
}

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

  // Pick a preset deterministically from industry + voice. The picker
  // is in @orb/motion-reel/presets; we duplicate the cheap regex
  // here to avoid a cross-package import inside the API agent.
  const preset = pickPresetForBrief({
    industry: args.industry ?? null,
    brandVoice: args.brandVoice
      ? JSON.stringify(args.brandVoice).slice(0, 400)
      : null,
  });
  const presetBlock = `\n\n=== PRESET: ${preset} ===\nUse the editorial-bold scene catalog (editorial-opener, bold-statement, icon-list, numbered-diagram, editorial-closer) as the DEFAULT. Mix in legacy scenes (hook, stat, contrast, quote, punchline, list, hashtags, brand-stamp, data-bar) only when editorial-bold scenes can't carry the brief.`;

  const userMessage = `Content brief:\n${args.brief}${voiceBlock}${businessBlock}${industryBlock}${presetBlock}${langDirective}`;

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
