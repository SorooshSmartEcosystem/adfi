// Video agent — turns a content brief (Echo draft + brand voice) into a
// MotionDirective the @orb/motion-reel renderer can consume.
//
// Why a separate agent rather than baking this into Echo: video
// templates have hard structural constraints (a quote reel needs ≤240
// chars; a stat reel needs a single number + label + context line; a
// list reel needs exactly 3 items). Asking Echo to produce both a feed
// post AND a video at once muddies its prompt and produces hedgey
// in-between content. This agent specializes — it picks the best
// template for the brief and fills the slot values cleanly.
//
// Cost note: Sonnet, not Opus. Template selection + slot filling is
// closer to Echo's drafting than Strategist's brand-defining work, and
// Sonnet handles JSON-schema-constrained output reliably.

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
// Mirror the @orb/motion-reel MotionDirective shape but tighter for
// model output. Items past UI caps get trimmed below.
const QuoteContentSchema = z.object({
  quote: z.string().min(20).max(240),
  attribution: z.string().max(80).optional(),
});
const StatContentSchema = z.object({
  value: z.union([z.number(), z.string()]),
  prefix: z.string().max(8).optional(),
  suffix: z.string().max(8).optional(),
  label: z.string().min(2).max(40),
  context: z.string().min(10).max(140),
});
const ListContentSchema = z.object({
  title: z.string().min(4).max(80),
  items: z
    .array(
      z.object({
        headline: z.string().min(4).max(60),
        body: z.string().min(8).max(120),
      }),
    )
    .min(2)
    .max(4),
});

// Design knobs — let the agent pick palette/pace/copy that match the
// industry + brand voice + post mood. The renderer applies sensible
// defaults if any field is omitted.
const VideoDesignSchema = z.object({
  style: z.enum(["minimal", "bold", "warm", "editorial"]),
  accent: z.enum(["alive", "attn", "urgent", "ink"]),
  pace: z.enum(["slow", "medium", "fast"]),
  statusLabel: z.string().min(2).max(40),
  hookLabel: z.string().min(2).max(40),
  metaLabel: z.string().min(2).max(40),
  closerLabel: z.string().min(2).max(40),
});

const VideoDirectiveSchema = z.discriminatedUnion("template", [
  z.object({
    template: z.literal("quote"),
    content: QuoteContentSchema,
    design: VideoDesignSchema,
  }),
  z.object({
    template: z.literal("stat"),
    content: StatContentSchema,
    design: VideoDesignSchema,
  }),
  z.object({
    template: z.literal("list"),
    content: ListContentSchema,
    design: VideoDesignSchema,
  }),
]);

export type VideoDirective = z.infer<typeof VideoDirectiveSchema>;

// ------------------- System prompt -------------------
const VIDEO_SYSTEM_PROMPT = `You are ADFI's video agent. You turn a content brief into a short
animated video specification that the renderer will turn into an mp4.

You have THREE templates. Pick the one that best fits the brief:

1. quote — a single short quote (≤240 chars) with optional
   attribution. Use for: opinion takes, brand value statements,
   inspirational lines, observations the audience would screenshot.
   Quote should be in the brand's voice — not generic motivation.

2. stat — one big number with a short label above and a context line
   below. Use for: weekly results, product specs, milestones,
   benchmarks. The number must be real (sourced from the brief or
   trivially derivable). Don't invent stats. Use prefix/suffix for
   currency or units (e.g. prefix:"$" or suffix:"%").

3. list — a "3 things" reel: title + 2-4 short items each with a
   headline and a one-sentence body. Use for: tips, reasons,
   mistakes-to-avoid, how-to lists. Default to exactly 3 items —
   reels work best with three. Headlines should be punchy (4-6
   words); bodies one sentence (≤120 chars).

WHICH TO PICK
  - One memorable line that stands alone → quote
  - A number that proves a point → stat
  - Multiple parallel pieces → list
  - When in doubt, default to quote (cheapest production, highest
    completion rate among reels).

VOICE
  - Match the user's brand voice (tone, pillars). Echo of the brief.
  - Lowercase if that's what the brand uses.
  - Don't add punctuation flourishes the brand wouldn't use (no em-dashes
    if the rest of their voice is plain commas).
  - Keep it human — agents fail when they sound like ad copy.

LANGUAGE
  - Match the language of the brief. If the brief is in Farsi, every
    string in your output is in Farsi. Same for any non-English brand.
    Never mix languages within a single video. Mono-label copy
    (statusLabel/hookLabel/etc.) is also in the source language —
    no English fallback strings.

DESIGN KNOBS — pick these so the video feels distinct per business.
The same template should look different for a fitness coach vs. a
tax accountant vs. a ceramics studio. You're an art director, not
just a copywriter.

  style — overall aesthetic. Match the BRAND, not just the post:
    - minimal: light cards, restrained type, slow pace. Good for
      legal/financial/wellness/luxury — anyone whose brand voice
      reads "calm, considered, precise".
    - bold: dark hero card, big display type, faster pace. Good for
      fitness/sports/youth brands/announcements/sales/launches.
    - warm: amber/alive accents, more humanistic, soft pace. Good for
      food/craft/family/community/handmade.
    - editorial: magazine-style, italic accents, longer holds. Good
      for design/architecture/fashion/considered storytelling.

  accent — primary color used on dots, underlines, hero numbers:
    - alive (green): growth, good news, default for stats trending up
    - attn (amber): caution, opportunity, urgency, sale, deadline
    - urgent (red): stop-scroll, problem, mistake-to-avoid
    - ink (mono): no accent — most editorial, used with style=editorial

  pace — motion timing:
    - slow: meditative, reflective quotes, sleep/wellness brands
    - medium: default for most posts
    - fast: stat/announcement reels, sports/youth brands, sales

  Mono labels (uppercase). These appear on the cards themselves:
    - statusLabel: top-of-screen status. Pick what kind of moment
      this is. e.g. "TODAY'S NOTE", "MORNING THOUGHT",
      "WEEKLY UPDATE", "QUICK TIP", "BACKSTORY", "BIG NEWS".
    - hookLabel: card 1's mono header above the main content.
      e.g. "WROTE IN YOUR VOICE", "ON HONEST WORK", "WHY WE STARTED",
      "THIS WEEK", "BEFORE YOU SCROLL".
    - metaLabel: card 2's mono header. Frames the supporting context.
      e.g. "POST PREVIEW", "BACKSTORY", "WHY IT MATTERS",
      "WHAT'S NEXT", "QUICK CONTEXT".
    - closerLabel: card 3's mono header on the brand stamp card.
      e.g. "PUBLISHED", "SHARE THIS", "SAVE FOR LATER",
      "TAG SOMEONE", "MORE COMING".

  Pick labels that fit the brand voice + post type. A pottery studio's
  hookLabel could be "FROM THE STUDIO". A fitness coach's hookLabel
  could be "TODAY'S MISSION". A tax accountant's could be
  "FRIENDLY REMINDER".

OUTPUT
  Strict JSON matching the schema. Every design field required.
  No prose around it.`;

// ------------------- Public API -------------------
export type VideoAgentInput = {
  // Required: the textual seed for the video. Usually the body of an
  // Echo draft or a one-line brief from the user ("post about why
  // we're closing early on saturdays").
  brief: string;
  // Brand voice for tone matching. Optional — without it the agent
  // falls back to a neutral voice. Highly recommended.
  brandVoice?: BrandVoice | null;
  // Business name for attributions / fallback CTA wording.
  businessName?: string;
  // Optional template hint. When set, the agent must use that
  // template (skip template selection). Use this when the user
  // explicitly picks a template in the UI.
  templateHint?: VideoDirective["template"];
  // Threading for cost tracking + audit. userId is required to log;
  // omit only for one-off internal calls (tests).
  userId?: string;
};

export async function runVideoAgent(
  args: VideoAgentInput,
): Promise<VideoDirective> {
  const lang = detectLanguage(args.brief);
  const langDirective =
    lang.code === "en"
      ? ""
      : `\n\n=== LANGUAGE LOCK ===\nThe brief above is in ${lang.label}. EVERY string in your output — quote, attribution, label, context, title, item.headline, item.body — MUST be in ${lang.label}. Not English. Not transliterated. The video is for an audience that reads ${lang.label}.`;

  const voiceBlock = args.brandVoice
    ? `\n\nBrand voice (match its tone + pillars):\n${JSON.stringify(args.brandVoice, null, 2)}`
    : "";

  const businessBlock = args.businessName
    ? `\n\nBusiness name: ${args.businessName}`
    : "";

  const hintBlock = args.templateHint
    ? `\n\nTemplate selection LOCKED: use template="${args.templateHint}". Do not pick a different template.`
    : "";

  const userMessage = `Content brief:\n${args.brief}${voiceBlock}${businessBlock}${hintBlock}${langDirective}`;

  const response = await anthropic().messages.create({
    model: MODELS.SONNET,
    max_tokens: 1500,
    system: [
      {
        type: "text",
        text: VIDEO_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
    output_config: {
      format: {
        type: "json_schema",
        schema: jsonSchemaForAnthropic(VideoDirectiveSchema),
      },
    },
  });

  if (args.userId) {
    void recordAnthropicUsage({
      userId: args.userId,
      agent: Agent.ECHO,
      eventType: "video_directive_generated",
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
  const parsed = VideoDirectiveSchema.parse(raw);
  return parsed;
}
