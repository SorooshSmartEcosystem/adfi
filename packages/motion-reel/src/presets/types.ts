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
  | "editorial-closer";

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
