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
import { generateImageSafe } from "../services/replicate";
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

// Icon names — taught in the prompt's ICON LIBRARY section, NOT
// constrained by the agent's structured-output schema. A 38-value
// z.enum compiles into a giant grammar tree that, when referenced
// in 5+ scenes' optional icon/motif fields, blows past Anthropic's
// grammar-size limit ("compiled grammar is too large"). Storing as
// a plain trimmed string keeps the grammar small; the renderer's
// `isIconName()` validates at runtime and falls back to a sensible
// default for any unrecognised value (so no breakage).
const IconNameZ = trim(40);

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
  duration: z.number(),
});

const IconListSchema = z.object({
  type: z.literal("icon-list"),
  title: trimOpt(80).optional(),
  // Array constraints (min/max, nested object enums) inflate the
  // grammar. Validation happens at runtime via the router schema
  // and the prompt teaches the agent the right shape. Keeping the
  // zod here permissive so Anthropic's grammar compiler stays
  // under its size cap.
  items: z.array(
    z.object({
      icon: trim(40),
      label: trim(40),
    }),
  ),
  highlightIndex: z.number().optional(),
  duration: z.number(),
});

const NumberedDiagramSchema = z.object({
  type: z.literal("numbered-diagram"),
  title: trimOpt(60).optional(),
  center: trim(48),
  callouts: z.array(z.object({ label: trim(60) })),
  duration: z.number(),
});

const EditorialOpenerSchema = z.object({
  type: z.literal("editorial-opener"),
  motif: IconNameZ.optional(),
  headline: trim(140),
  emphasis: trimOpt(40).optional(),
  duration: z.number(),
});

const EditorialClosingSchema = z.object({
  type: z.literal("editorial-closer"),
  motif: IconNameZ.optional(),
  cta: trimOpt(120).optional(),
  duration: z.number(),
});

// ── Phase 3 — structural variety scenes ─────────────────────────

// Phase 3 structural scenes — agent zod is intentionally permissive
// (no nested enums, no array min/max, no number/string unions). The
// router schema and runtime zod validate the parsed output strictly;
// the prompt teaches the agent the correct shape. Permissive here
// only so Anthropic's grammar compiler stays under its size cap.

const PhoneMockupSchema = z.object({
  type: z.literal("phone-mockup"),
  // Agent emits "message" | "notification" | "feed". Renderer's
  // switch falls back to "message" for anything else.
  kind: trim(20),
  body: trim(180),
  author: trimOpt(40).optional(),
  caption: trimOpt(120).optional(),
  duration: z.number(),
});

const MetricTileGridSchema = z.object({
  type: z.literal("metric-tile-grid"),
  title: trimOpt(80).optional(),
  tiles: z.array(
    z.object({
      label: trim(40),
      // Agent emits a numeric string ("4200" or "$4.2k") — renderer's
      // CounterNumber parses if numeric, otherwise displays as-is.
      value: trim(40),
      prefix: trimOpt(8).optional(),
      suffix: trimOpt(8).optional(),
      delta: trimOpt(20).optional(),
    }),
  ),
  duration: z.number(),
});

const ChatThreadSchema = z.object({
  type: z.literal("chat-thread"),
  title: trimOpt(60).optional(),
  messages: z.array(
    z.object({
      // "you" | "them" taught in the prompt; renderer treats
      // anything but "them" as "you".
      sender: trim(10),
      text: trim(200),
    }),
  ),
  duration: z.number(),
});

const TerminalSchema = z.object({
  type: z.literal("terminal"),
  title: trimOpt(60).optional(),
  prompt: trimOpt(4).optional(),
  lines: z.array(
    z.object({
      text: trim(140),
      // "command" | "output" | "error" taught in the prompt;
      // renderer treats anything but "output"/"error" as "command".
      kind: trim(10),
    }),
  ),
  duration: z.number(),
});

// HeroPhotoScene — full-bleed AI-generated photo with a heavy display
// text overlay. The agent emits `imagePrompt` (visual brief); the
// API package's backfillImagesForVideoScript runs Replicate Flux
// Schnell on every hero-photo scene and patches `imageUrl` into the
// script before render. Render-time fallback if URL missing.
//
// `textAnchor` and `treatment` are left as plain strings so the
// agent's grammar stays small. Renderer falls back to defaults
// ("bottom-left", "darken") for unrecognised values.
const HeroPhotoSchema = z.object({
  type: z.literal("hero-photo"),
  headline: trim(80),
  subhead: trimOpt(120).optional(),
  emphasis: trimOpt(40).optional(),
  imagePrompt: trim(400),
  textAnchor: trimOpt(20).optional(),
  treatment: trimOpt(20).optional(),
  duration: z.number(),
});

// AGENT scene schema — editorial-bold scenes only. Anthropic's
// structured output has a 24-optional-parameter cap; including the
// 9 legacy scenes pushes us to 27. Keeping the agent schema small
// also nudges Haiku toward the preferred preset (no need for the
// fallback scenes when the brief fits editorial-bold's 5 scene
// types, which is ~all the time for solopreneur content).
//
// Legacy scenes (hook, stat, contrast, quote, punchline, list,
// hashtags, brand-stamp, data-bar) still exist in the renderer's
// switch and the router's input validator; they just don't get
// emitted by the agent. Old persisted scripts containing legacy
// scenes still render fine.
// AGENT scene schema — 7 scenes max. We had 9 (5 editorial + 4
// structural) but Anthropic's grammar compiler rejected with
// "compiled grammar is too large". Each scene with a nested array
// of objects multiplies the grammar size; trimming chat-thread +
// terminal keeps us under the cap. They stay in the RENDERER and
// the ROUTER schema for user-edited scripts, just not emitted by
// the agent.
// AGENT scene schema — 7 scenes. Anthropic's grammar compiler caps
// us at ~7 union members with nested optional fields. Adding
// hero-photo (Phase 2.5) means dropping numbered-diagram from the
// AGENT union; numbered-diagram stays in the renderer + router so
// legacy scripts and user-edited scripts still work — the agent
// just won't emit it. icon-list covers most "structured argument"
// territory and the photo lift is bigger than the diagram lift for
// brand differentiation.
const SceneSchema = z.discriminatedUnion("type", [
  // editorial-bold preset (4 scenes — numbered-diagram dropped from agent)
  EditorialOpenerSchema,
  BoldStatementSchema,
  IconListSchema,
  EditorialClosingSchema,
  // structural variety (2 scenes — most universal of the 4 built)
  PhoneMockupSchema,
  MetricTileGridSchema,
  // photo (Phase 2.5)
  HeroPhotoSchema,
]);


const VideoDesignSchema = z.object({
  style: z.enum(["minimal", "bold", "warm", "editorial"]),
  accent: z.enum(["alive", "attn", "urgent", "ink"]),
  pace: z.enum(["slow", "medium", "fast"]),
  statusLabel: trim(60),
  hookLabel: trim(60),
  metaLabel: trim(60),
  closerLabel: trim(60),
  // Per-post mood. Drives renderer's typography weight, accent
  // saturation, pace multiplier, and italic emphasis. Required so
  // every script gets a deliberate energy choice.
  mood: z.enum([
    "confident",
    "calm",
    "energetic",
    "urgent",
    "contemplative",
    "celebratory",
  ]),
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

// Narrative arc — forces the agent to commit to a SHAPE before
// picking scene types. Without this every reel converged on
// "opener → bold-statement → bold-statement → closer" because
// bold-statement is the highest-prior body scene. Echo had the
// same lock-in problem before bodyShape; same fix applies here.
const NarrativeArcZ = z.enum([
  "claim_then_proof",   // bold thesis → 2 supporting beats → closer
  "before_after",       // setup state → turn → outcome
  "list_walk",          // icon-list or numbered-diagram heavy
  "scene_to_data",      // phone-mockup or scene → metric-tile-grid
  "data_to_scene",      // metric-tile-grid → phone-mockup → bold-statement
  "argument_unfolds",   // statement → counter → resolution
  "milestone_reveal",   // build-up → metric-tile-grid celebration
  "process_walkthrough",// numbered-diagram → icon-list → punchline
]);

const VideoScriptSchema = z.object({
  scenes: z.array(SceneSchema).min(3).max(8),
  design: VideoDesignSchema,
  preset: PresetNameZ.optional(),
  narrativeArc: NarrativeArcZ,
  // Echo's hunch on whether this lands above the brand's baseline.
  // 0–1, default range 0.3–0.6, 0.7+ requires real distinctiveness.
  viralPotential: z.number(),
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

You generate reels using the editorial-bold scene catalog (5 scenes).
This catalog produces reels in the visual style of strong founder
and business content: white background, heavy black display type,
one accent color for emphasis, a recurring brand motif as a
continuity glyph, generous whitespace, mixed-weight composition.

EVERY reel uses scenes from this catalog only. Do not invent scene
types. Do not use legacy types (hook, stat, quote, punchline, list,
hashtags, brand-stamp, contrast, data-bar) — they exist only for
back-compat with old persisted scripts.

1. editorial-opener — The opening beat. A small recurring brand
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

2. bold-statement — The workhorse body scene. Mixed-weight
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

3. icon-list — Vertical pillar list with circle icons. 3-6 entries
    each with an icon + label. Used for "X principles", "X reasons",
    "X benefits" content.
    { type: "icon-list", title?, items: [{icon, label}], highlightIndex?, duration }
    - title: optional uppercase header above the list, ≤80 chars.
    - items: 3-6 entries. Each must specify an icon name from the
      ICON LIBRARY plus a short label (≤40 chars).
    - highlightIndex: optional 0-indexed row to highlight with an
      accent panel. Use sparingly — at most one row per scene.
    - duration: 4-7s. More items needs more time.

5. editorial-closer — The closing beat. Brand motif sits at the
    center, business name in heavy display type below, optional CTA
    pill. ALWAYS last scene when using editorial-bold preset.
    { type: "editorial-closer", motif?, cta?, duration }
    - motif: SAME icon name as the editorial-opener. Continuity glyph.
    - cta: optional CTA pill. ≤80 chars.
    - duration: 2-3s.

==============================================================
STRUCTURAL VARIETY SCENES — USE THESE CONSTANTLY
==============================================================

Don't make every reel five text scenes in a row. The 4 scenes below
are STRUCTURAL — they look fundamentally different from text-only
scenes and MUST appear in most reels. A 5-scene reel should usually
contain at least ONE structural scene, often two.

Pick by content type:

6. phone-mockup — Show content happening on a phone. Use when the
   brief implies a customer message, a product feature, a posted
   update, or a notification.
   { type: "phone-mockup", kind, body, author?, caption?, duration }
   - kind: "message" | "notification" | "feed"
     * "message": single chat bubble appearing — quote a customer
       reaction, a DM, an inbound question
     * "notification": phone notification banner — alerts, updates,
       "new signup", launches
     * "feed": single feed post tile — show what a post looks like
   - body: the content displayed inside the phone (≤180 chars)
   - author: sender name or app name. Default "you"
   - caption: optional headline above the phone
   - duration: 4-6s.

7b. hero-photo — Full-bleed AI-generated photo with heavy text overlay.
    Adds real-world atmosphere to reels that would otherwise be all-text
    editorial. The biggest single visual upgrade available without an
    audio layer. Use ONE per reel max (usually scene 2 or scene 3).
    { type: "hero-photo", headline, subhead?, emphasis?, imagePrompt,
      textAnchor?, treatment?, duration }
    - headline: ≤80 chars on-screen text. Same constraints as
      bold-statement hero — concrete, branded, one accent word.
    - subhead: optional ≤120-char support line in mono type.
    - emphasis: optional word from headline to color in accent. Default:
      last word.
    - imagePrompt: the visual brief the image-gen pipeline runs.
      Specific subject, framing, light, palette. e.g. "hands centering
      wet clay on wheel mid-throw, golden window light from left,
      neutral linen apron, top-third framing". Avoid logos,
      text-on-image, and people's faces unless the niche requires
      them. Avoid invented people / brands / products — describe a
      generic subject the photo gen handles cleanly.
    - textAnchor: "top-left" | "bottom-left" | "bottom-right" | "center".
      Default "bottom-left". Pick to leave the photo's subject visible.
    - treatment: "darken" | "lighten" | "vignette" | "none". Default
      "darken" (white text on darkened photo). Use "lighten" only if
      the imagePrompt produces a dark scene where black text reads.
    - duration: 4-6s. Photos need time to land; don't rush.

    USE hero-photo for:
    - Opening establishing shots ("the studio", "the kitchen at 6am")
    - Scene-setting beats ("a quiet morning", "the dashboard glow")
    - Show-don't-tell moments where a photo says more than text
    - Brand moments — products, materials, environments
    DO NOT use hero-photo for:
    - Data, lists, comparisons (use metric-tile-grid / icon-list)
    - Customer testimonials (use phone-mockup kind="message")
    - Quick punchlines (the photo competes with the text)
    NEVER emit more than ONE hero-photo per reel — multiple AI photos
    in a row reads as a slideshow.

7. metric-tile-grid — KPI dashboard with 2-4 tiles. Use when the
   brief has multiple comparable numbers ("we hit X traders, Y
   volume, Z markets") or "by-the-numbers" content.
   { type: "metric-tile-grid", title?, tiles: [{label, value, prefix?, suffix?, delta?}], duration }
   - 2-4 tiles. Each: label, value (numeric counts up), optional
     prefix/suffix (units only — "$", "%", "k"), optional delta
     ("+12%" or "-3%" — renderer colors based on sign).
   - title: optional uppercase header.
   - duration: 4-6s.

Picking rules:
- Crypto / fintech / SaaS / dev brand → metric-tile-grid for
  numbers; phone-mockup (kind: "notification") for launches /
  alerts.
- Coach / wellness / family brand → phone-mockup (kind: "message")
  for testimonials and customer questions.
- Renovation / luxury / craft brand → phone-mockup (kind: "feed")
  for "post a photo" content.
- ANY brand celebrating a milestone → metric-tile-grid is great.
- ANY brand quoting a customer → phone-mockup (kind: "message").

Editorial-bold composition arc:
  scene 1: editorial-opener  (mark + spotlight + headline)
  scenes 2..N-1: bold-statement, icon-list, phone-mockup,
                 metric-tile-grid, OR hero-photo (max 1 per reel) —
                 avoid same scene type twice in a row
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

Every reel follows this 4–6 scene arc:
  [editorial-opener → 2-4 body scenes → editorial-closer]

Body scenes are picked from: bold-statement, icon-list,
phone-mockup, metric-tile-grid, hero-photo. **At LEAST one body
scene MUST be a structural OR photo scene (phone-mockup,
metric-tile-grid, or hero-photo)** — back-to-back bold-statement
scenes read as a slide deck.

A good 18-22s script:
  editorial-opener  → bold-statement  → hero-photo  →
  bold-statement  → editorial-closer

A "tips / pillars" post:
  editorial-opener → icon-list → bold-statement → editorial-closer

A "show, don't tell" post:
  editorial-opener → hero-photo → bold-statement →
  metric-tile-grid → editorial-closer

ALWAYS scene 1 = editorial-opener.
ALWAYS last scene = editorial-closer.
ALWAYS use the SAME "motif" icon name for the opener and the closer
(continuity glyph for the brand).

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

Mood (REQUIRED): pick ONE per script. Mood drives the renderer's
typography weight, accent saturation, animation pace, and italic
treatment. Two posts from the same brand should have DIFFERENT moods
when the briefs are different. Pick by reading the brief AND the
brand voice:

  confident — default. Founder takes, opinion pieces, statements.
              Heavy display, snappy reveals.
  calm      — wellness, family, soft brands. Slower stagger, lighter
              weight, restrained accent.
  energetic — launches, drops, "we shipped X", celebrations of work.
              Fast pace, full-saturation accent, bouncy easing.
  urgent    — alerts, urgent CTAs, "stop doing X", warnings,
              deadline-driven posts. Fast pace, sharper cuts,
              high-saturation accent.
  contemplative — deep thoughts, philosophical takes, quote-driven
                  posts. Long holds, italic accent, muted palette.
  celebratory — milestones, anniversaries, achievements, thank-yous.
                Sparkle motifs, full-saturation accent, playful pace.

Pick mood by the brief's energy first, brand voice second. A pottery
studio with warm voice posting "we hit 200 sales" is celebratory,
NOT calm — even though the brand is calm overall.

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
  scene: { type: "bold-statement", lead: "Most",
           hero: "$46.7B into crypto ETFs in 2025", emphasis: "ETFs" }

RIGHT (qualitative — no fabricated number):
  brief: "Crypto ETF inflows are huge"
  scene: { type: "bold-statement", lead: "Crypto ETFs",
           hero: "broke every inflow record this cycle", emphasis: "record" }

If the brief contains a phrase like "we hit $50K in February", you may
quote that exact figure verbatim inside the "hero" field of a
bold-statement. Otherwise write qualitatively — no fabricated numbers.

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
ANTI-PATTERNS — never ship these
==============================================================

These are the templates the agent defaults to when uncertain. Every
one of them reads as "AI generated reel" no matter how specific the
brief is. Do not use them.

- "editorial-opener → bold-statement → bold-statement → editorial-closer"
  — the most-overused 4-scene shape. If you write two bold-statements
  back-to-back, replace one with a structural scene (phone-mockup,
  metric-tile-grid, numbered-diagram) or with icon-list.
- Two consecutive scenes of the same type, ever. Even three
  bold-statements in a 5-scene reel reads like a slide deck.
- Hero text always landing on the same word position. Mix where the
  emphasis word sits — start, middle, end — across scenes within ONE
  reel and across reels for ONE brand.
- Every reel having the SAME structural beat at the SAME index. If
  this brand's last reel had a metric-tile-grid at scene 3, this
  reel's metric-tile-grid (if any) goes elsewhere — or skip it.
- Rhetorical "X. Then Y." constructions in every hero. Vary syntax.
- All-uppercase mono labels that are generic ("TODAY'S NOTE",
  "BIG NEWS", "WEEKLY UPDATE"). If the brand voice doesn't naturally
  speak that way, write a label that names a SPECIFIC thing
  ("Q3 NUMBERS", "FIVE YEARS IN", "ON A TUESDAY").
- "Editorial closer" CTAs that say "share this" / "tag someone" /
  "more coming" — those are filler. Write a CTA that's specific to
  THIS post or omit cta entirely (closer renders fine without one).
- ANY phrase from the brief copy-pasted verbatim into the hero. Echo
  the brief's information, not its sentences.

==============================================================
NARRATIVE ARC — pick BEFORE picking scenes
==============================================================

Pick a narrativeArc first; let the arc determine which scenes you
emit. This is the structural variety lever. Without it every reel
converges on claim_then_proof.

  claim_then_proof    — opener → bold thesis → 2 supporting beats → closer
  before_after        — opener → setup state → turn moment → outcome → closer
  list_walk           — opener → icon-list → bold-statement → closer
                        (or: opener → numbered-diagram → list scene)
  scene_to_data       — opener → phone-mockup → metric-tile-grid →
                        bold-statement → closer
  data_to_scene       — opener → metric-tile-grid → phone-mockup →
                        bold-statement → closer
  argument_unfolds    — opener → statement A → counter B → resolution → closer
  milestone_reveal    — opener → build-up → metric-tile-grid →
                        celebration line → closer
  process_walkthrough — opener → icon-list → bold-statement →
                        metric-tile-grid → closer

If recent reels for THIS brand used claim_then_proof (you'll see this
in the user message via STRUCTURAL FINGERPRINTS), pick a DIFFERENT
arc. Variety reel-to-reel is more important than picking the
"perfect" arc per reel.

==============================================================
VIRAL POTENTIAL
==============================================================

Score 0–1 your honest read of whether this reel lands above the
brand's baseline reach. Be skeptical. Default range 0.3–0.6.
- 0.7+ requires (a) a hook that's truly distinctive — not a
  template — AND (b) one structural scene that earns surprise AND
  (c) the reel says one thing, sharply.
- 0.9+ requires real surprise: a specific number, a counterintuitive
  claim, a scene only this brand could authentically deliver.
- If you'd swipe past it on your own feed, score below 0.5.

==============================================================
OUTPUT
==============================================================

Strict JSON matching the schema. Every scene has type + duration.
Every design field required. narrativeArc REQUIRED. viralPotential
REQUIRED. No prose around the JSON.`;

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
  // Recent reels for this brand. Used to surface structural fingerprints
  // (narrativeArc + scene-type sequence + opener headline) so the agent
  // sees the lock-in pattern and picks something different. Pass at most
  // the 3-5 most recent; older context dilutes the signal.
  recentScripts?: VideoScript[];
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
  const presetBlock = `\n\n=== PRESET: ${preset} ===\nUse this scene catalog only: editorial-opener, bold-statement, icon-list, editorial-closer, phone-mockup, metric-tile-grid, hero-photo. The schema does not allow legacy scene types or numbered-diagram (back-compat only — user-editable, not agent-emitted).`;

  // Structural-fingerprint guard. Without this the agent kept emitting
  // "opener → bold-statement → bold-statement → closer" reel after reel
  // because bold-statement is the highest-prior body scene. Surfacing
  // the LAST reels' arc + scene sequence + opener headline forces a
  // visible deviation.
  const fingerprintBlock = args.recentScripts && args.recentScripts.length > 0
    ? `\n\n=== STRUCTURAL FINGERPRINTS — DO NOT REPEAT ===\nThis brand's last reels used these arcs and scene sequences. Pick a DIFFERENT narrativeArc and a DIFFERENT scene-type sequence:\n${args.recentScripts
        .slice(0, 5)
        .map((s, i) => {
          const opener = s.scenes[0];
          const openerHeadline =
            opener && "headline" in opener && typeof opener.headline === "string"
              ? opener.headline.slice(0, 60)
              : "(no headline)";
          const sequence = s.scenes.map((sc) => sc.type).join(" → ");
          return `  ${i + 1}. arc=${s.narrativeArc ?? "?"} | sequence=${sequence} | opener="${openerHeadline}"`;
        })
        .join("\n")}\n`
    : "";

  const userMessage = `Content brief:\n${args.brief}${voiceBlock}${businessBlock}${industryBlock}${presetBlock}${fingerprintBlock}${langDirective}`;

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

// ------------------- Image backfill -------------------
// Walks a VideoScript, finds every hero-photo scene that's missing
// imageUrl, runs Replicate Flux Schnell on each scene's imagePrompt,
// and returns a new script with URLs patched in. Bounded concurrency
// so we don't trip Replicate's 429 storms (same cap Echo uses for
// reel beats — 2 in flight per draft).
//
// Cost: ~$0.003 per generated image. A reel emitting one hero-photo
// adds ~0.3¢ to the per-video cost. Total per-video ceiling stays
// well under the 10¢ user target even with the script + render.
//
// Failures are silent — if image gen fails for a scene, the scene
// renders without a photo (HeroPhotoScene falls back to a solid
// frame with the overlay text). Don't break the whole reel for one
// bad image gen.
export async function backfillImagesForVideoScript(args: {
  script: VideoScript;
  userId: string;
  draftId?: string;
  // Optional brand-kit imageStyle prefix that gets prepended to every
  // imagePrompt (matches Echo's behavior so video photos look like
  // post photos for the same brand).
  imageStyle?: string;
}): Promise<VideoScript> {
  const stylize = (raw: string): string =>
    args.imageStyle ? `${args.imageStyle} ${raw}` : raw;

  // Collect hero-photo scene indices that need an image.
  const indices: number[] = [];
  args.script.scenes.forEach((scene, i) => {
    if (
      scene.type === "hero-photo" &&
      "imagePrompt" in scene &&
      scene.imagePrompt &&
      !("imageUrl" in scene && scene.imageUrl)
    ) {
      indices.push(i);
    }
  });
  if (indices.length === 0) return args.script;

  // Bounded concurrency — 2 in flight max. Replicate's burst limiter
  // returns 429s above ~3 concurrent jobs from one client, and the
  // backoff stacks so retries fail in cascade. Echo learned this the
  // hard way; mirror its `runWithConcurrency` pattern here.
  const limit = 2;
  const results = new Array<string | null>(indices.length).fill(null);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (true) {
      const k = cursor++;
      if (k >= indices.length) return;
      const sceneIndex = indices[k]!;
      const scene = args.script.scenes[sceneIndex] as { imagePrompt?: string };
      if (!scene.imagePrompt) continue;
      const r = await generateImageSafe({
        userId: args.userId,
        draftId: args.draftId ?? "video",
        slug: `video-hero-${sceneIndex}`,
        prompt: stylize(scene.imagePrompt),
        // Reels are 9:16 vertical
        aspectRatio: "9:16",
      });
      results[k] = r ? r.url : null;
    }
  }
  const workers = Array.from(
    { length: Math.min(limit, indices.length) },
    () => worker(),
  );
  await Promise.all(workers);

  // Patch URLs back into a new scenes array (immutable; renderer reads
  // the script object as-is).
  const nextScenes = args.script.scenes.map((s, i) => {
    const slot = indices.indexOf(i);
    if (slot < 0) return s;
    const url = results[slot];
    if (!url) return s;
    return { ...s, imageUrl: url };
  });
  return { ...args.script, scenes: nextScenes };
}
