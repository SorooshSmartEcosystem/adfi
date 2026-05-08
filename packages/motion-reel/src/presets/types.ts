// Shared types for the preset system. A preset is a bundle of
// (palette rules + type pair + scene catalog + motion language +
// image treatment) that defines a complete visual world for a brand.
// The agent (via a deterministic picker) selects ONE preset per
// business based on industry + brand voice; the preset then dictates
// how every scene in every video for that brand looks.
//
// Preset names are deliberately descriptive — `editorial-bold` not
// `style-1` — so reviewers + future contributors can scan the
// catalog without reading every preset config.

export type PresetName =
  | "editorial-bold" // Empire Labs style: white bg, heavy black type, accent emphasis, photo cutouts
  | "dashboard-tech" // Dark mode, terminal accents, animated charts (planned)
  | "soft-minimal" // Cream bg, slim serif accents, generous whitespace (planned)
  | "luxury" // Deep navy + gold, slim editorial serif (planned)
  | "studio-craft" // Warm cream tones, paper textures, organic photos (planned)
  | "documentary" // Slow Ken-Burns, lower-third captions (planned)
  | "generic"; // Fallback — original scene catalog (hook/stat/contrast/etc.)

// Scene names this preset can render. Each scene is implemented as a
// React component the renderer's switch dispatches to.
export type PresetSceneName =
  // editorial-bold catalog
  | "bold-statement"
  | "numbered-diagram"
  | "icon-list"
  | "editorial-opener"
  | "editorial-closer"
  | "hero-photo";

// ── editorial-bold scene shapes ────────────────────────────────
// Defined here (not in the .tsx scene files) so packages without JSX
// support — the API package's tsconfig — can import them through
// the type-only path without pulling in TSX components.

export type BoldStatementShape = {
  type: "bold-statement";
  lead?: string;
  hero: string;
  emphasis?: string;
  trail?: string;
  // Optional layout override. Renderer rotates layouts by scene index
  // when this is omitted. Agent doesn't emit it today (kept out of
  // the agent's zod to stay under Anthropic's 24-optional cap), but
  // the field is here so future agents or user-edited scripts can
  // set it explicitly.
  layout?: "centered" | "left-anchored" | "stacked-bottom";
  duration: number;
};

export type IconListShape = {
  type: "icon-list";
  title?: string;
  items: Array<{
    icon: string;
    label: string;
  }>;
  highlightIndex?: number;
  duration: number;
};

export type NumberedDiagramShape = {
  type: "numbered-diagram";
  title?: string;
  center: string;
  callouts: Array<{
    label: string;
  }>;
  duration: number;
};

export type EditorialOpenerShape = {
  type: "editorial-opener";
  motif?: string;
  headline: string;
  emphasis?: string;
  duration: number;
};

export type EditorialClosingShape = {
  type: "editorial-closer";
  motif?: string;
  cta?: string;
  duration: number;
};

// Phone mockup — vertical phone frame with one of three "kinds" of
// content animating inside.
//
// kind is typed loosely (string) because the agent zod is permissive
// to keep Anthropic's grammar under its size cap. The renderer
// switches on the three known values; anything else falls through
// to "message" (the most universally useful default).
export type PhoneMockupShape = {
  type: "phone-mockup";
  kind: string; // expected: "message" | "notification" | "feed"
  // The content that types/displays inside the phone screen.
  body: string;
  // Author / sender / app name. Optional. Default "you" or "App".
  author?: string;
  // Optional caption above the phone.
  caption?: string;
  duration: number;
};

// KPI tile grid — 2-4 tiles in a 1- or 2-column grid.
//
// `value` is a string; the renderer's CounterNumber checks if it
// parses to a number and animates if so, otherwise displays as-is.
// Loose typing keeps the agent's grammar small while still
// supporting numeric counters.
export type MetricTileGridShape = {
  type: "metric-tile-grid";
  title?: string;
  tiles: Array<{
    label: string;
    value: number | string;
    prefix?: string;
    suffix?: string;
    // Optional delta. Renderer reads first character: "+" → accent
    // color, "-" → urgent red, otherwise muted.
    delta?: string;
  }>;
  duration: number;
};

// Chat thread — 2-4 alternating messages between "you" and "them".
export type ChatThreadShape = {
  type: "chat-thread";
  title?: string;
  messages: Array<{
    // Expected "you" | "them". Loosely typed because the agent zod
    // is permissive; renderer treats anything but "them" as "you".
    sender: string;
    text: string;
  }>;
  duration: number;
};

// Hero photo — full-bleed AI-generated photo with a heavy display
// text overlay. The biggest visual unlock available without an audio
// layer. Uses Echo's existing Replicate Flux Schnell pipeline; the
// API package fills `imageUrl` after the agent returns the script.
//
// The agent emits `imagePrompt` (the visual brief — specific subject,
// framing, light, palette) but NOT `imageUrl`. The backfill step
// generates the image from the prompt and patches the URL into the
// script before render. If imageUrl is missing at render time, the
// scene falls back to a solid-color frame with the overlay text —
// still ships, just without the photo.
//
// Agent rules (in VIDEO_SYSTEM_PROMPT): use hero-photo for moments
// that benefit from real-world atmosphere — opening establishing
// shots, "show, don't tell" moments, scene-setting beats. Avoid
// hero-photo for data-heavy or list scenes; the photo competes
// with the information.
export type HeroPhotoShape = {
  type: "hero-photo";
  // The on-screen text overlay. ≤80 chars; longer truncates.
  // Heavy display, ink color (or white if photo is dark).
  headline: string;
  // Optional small support line under headline. ≤120 chars.
  subhead?: string;
  // Optional one word from headline to colorize as accent. Default:
  // last word.
  emphasis?: string;
  // Visual brief the image-gen pipeline runs. Specific subject,
  // framing, light, palette. e.g. "hands centering wet clay on wheel
  // mid-throw, golden window light from left, neutral linen apron".
  // Avoid logos, text-on-image, and people's faces unless the niche
  // requires them.
  imagePrompt: string;
  // Filled by the API's backfill step before render. Agent never
  // emits this. Renderer falls back to a solid frame if missing.
  imageUrl?: string;
  // Where the headline sits on the photo. Default "bottom-left".
  // Loosely typed (string) to match the agent's permissive zod —
  // renderer's switch falls back to "bottom-left" for unknown values.
  textAnchor?: string;
  // Photo treatment. Default "darken" — adds a 25% black overlay so
  // white text reads. "lighten" inverts for dark text on bright photos.
  // Loosely typed for the same reason as textAnchor.
  treatment?: string;
  duration: number;
};

// Terminal — fake monospace terminal with lines typing in.
export type TerminalShape = {
  type: "terminal";
  title?: string;
  // Default "$". Use ">" for PowerShell-style.
  prompt?: string;
  lines: Array<{
    text: string;
    // Expected "command" | "output" | "error". Loosely typed
    // because the agent zod is permissive; renderer treats anything
    // but "output" / "error" as a command.
    kind: string;
  }>;
  duration: number;
};

export type Preset = {
  name: PresetName;
  // Human-readable description for prompt + docs.
  description: string;
  // The scene names this preset supports. Agent picks from this list
  // when this preset is active.
  scenes: PresetSceneName[];
  // Tokens that override BrandKit defaults for this preset's look.
  // Background and contrast color are the load-bearing ones — they
  // determine the whole feel.
  tokens: {
    // CSS color string. "auto" means use BrandKit.bg.
    bg: string | "auto";
    // Primary text color. "auto" means BrandKit.ink.
    ink: string | "auto";
    // Light support text. "auto" means BrandKit.ink3.
    inkSupport: string | "auto";
    // Accent for emphasis words / icons. "auto" means BrandKit accent
    // resolved by design.accent.
    accent: string | "auto";
  };
  // Type pair for this preset.
  type: {
    display: string; // CSS font-family for hero text
    body: string; // CSS font-family for support text
    // Display weight extremes — heavy display reads as editorial,
    // medium display reads as documentary.
    displayWeight: number;
    bodyWeight: number;
  };
  // Optional: specific traits the renderer reads to adjust scenes.
  traits?: {
    // Forces white background regardless of design.style. editorial-bold
    // uses this so dark-mode brand kits still get the right look.
    forceLightBg?: boolean;
    // Letter-spacing (em) for display text. editorial-bold uses tight
    // -0.04 for the heavy headline aesthetic.
    displayTracking?: number;
  };
};
