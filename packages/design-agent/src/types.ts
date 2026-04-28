// Type system for the Design agent's 6-phase pipeline.
//
// Every phase reads what previous phases wrote. The shapes here are the
// contract between phases — they're stored in the database (mostly as
// JSON columns on BrandKit) and consumed by the specialist UI.

export type IndustryCategory =
  | "creator"
  | "service"
  | "retail"
  | "fintech"
  | "saas"
  | "hospitality"
  | "wellness"
  | "b2b"
  | "other";

// Phase 1 output. Strategic foundation that every later phase reads.
// All-string fields stay descriptive (not enum) on purpose — the model
// gets latitude on register and concept direction.
export type BrandKernel = {
  personality: string[]; // 3-5 single-word descriptors
  values: string[]; // 3-5 short value statements
  audienceArchetypes: { name: string; description: string }[];
  visualRegister: string; // e.g. "warm artisan", "tactical terminal"
  industryCategory: IndustryCategory;
  colorStrategy: string; // describes the palette feeling, no hexes
  logoConceptDirection: string; // describes the mark's character
};

// One color in a palette. Stored as hex (canonical), with rgb + hsl
// alongside so the UI doesn't reparse on every render.
export type ColorRole = {
  hex: string; // "#RRGGBB"
  rgb: { r: number; g: number; b: number }; // 0-255
  hsl: { h: number; s: number; l: number }; // h 0-360, s/l 0-100
};

// Phase 2 output. Mathematically valid + WCAG-AA-passing palette,
// derived from a single anchor hue + the kernel's color_strategy.
export type Palette = {
  primary: ColorRole; // anchor — the strategy's center of gravity
  secondary: ColorRole; // analogous, -30° hue
  accent: ColorRole; // complementary or split-complementary
  ink: ColorRole; // body text
  surface: ColorRole; // cards / raised
  background: ColorRole; // page
  border: ColorRole; // hairlines
  rationale: string; // human-readable explanation, surfaced in the brand book
};

// Result of running palette validation. `failures` lists every text/bg
// pair below threshold so the caller can decide whether to retry or
// surface the issue.
export type ContrastReport = {
  passes: boolean;
  failures: {
    fg: string; // role name
    bg: string;
    ratio: number;
    required: number; // 4.5 (body) or 3.0 (large)
  }[];
};

// Phase 3 output — three SVG variants, each a complete `<svg>...</svg>`
// string. Color values inside MUST be palette tokens or palette hexes,
// not arbitrary colors.
export type LogoSet = {
  primary: string; // full color, on light surface
  monochrome: string; // single ink color
  onDark: string; // optimized for dark backgrounds
  conceptDescription: string; // why the mark looks the way it does
};

// Phase 4 output — three abstract SVG cover compositions, 800x450.
// Used as social headers, presentation slides, email covers.
export type BrandGraphic = {
  svg: string;
  caption: string; // 1-line description for accessibility + brand book
};

// Phase 5 output — palette + mark applied to standard real-world mockups.
// Each rendered SVG is deterministic given the same inputs.
export type AppliedTemplates = {
  favicon: string; // 32x32 SVG
  socialAvatar: string; // 400x400 circular
  businessCard: string; // 85.6x54mm horizontal
  emailHeader: string; // 600x200 SVG
  instagramPost: string; // 1080x1080 SVG
};

// Phase 6 output — prose sections of the brand book, in this client's
// voice, specific to this client's audience and industry.
export type BrandVoice = {
  howItSounds: { descriptor: string; sampleSentence: string }[];
  brandValues: { value: string; oneLineDefinition: string }[];
  contentPillars: string[]; // 4-6 themes
  doDont: { do: string; dont: string }[]; // 5-7 pairs
  audienceArchetypes: { name: string; paragraph: string }[];
  imageStylePrefix: string; // prepended to every Echo image-gen prompt
};

// The complete artifact assembled from all six phases.
export type BrandKitArtifact = {
  businessId: string;
  version: number;
  kernel: BrandKernel;
  palette: Palette;
  logo: LogoSet;
  graphics: BrandGraphic[];
  templates: AppliedTemplates;
  voice: BrandVoice;
  generatedAt: Date;
};

// Slot map for template substitution. Keys are placeholder names without
// the `{{ }}` braces. Values are hex strings or full SVG fragments
// (e.g. an embedded `<g>...</g>` for the mark).
export type TemplateSlots = Record<string, string>;
