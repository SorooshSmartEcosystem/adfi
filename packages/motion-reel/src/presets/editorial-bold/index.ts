// editorial-bold preset — heavy black display type on white, single
// accent color for emphasis words, recurring brand motifs as
// continuity glyphs, mixed-weight composition. The reference is
// Empire Labs' Instagram (theempirelabs) — founder/business content.
//
// Best fit:
//   - Founders + coaches + B2B newsletters
//   - Opinion / takes / educational explainers
//   - Brands with confident, sharp voice
//
// What this preset is NOT for:
//   - Wellness / family / soft brands (use soft-minimal instead)
//   - Fintech with data heavy posts (use dashboard-tech)
//   - Luxury / hospitality (use luxury)

import type { Preset } from "../types";

export const editorialBoldPreset: Preset = {
  name: "editorial-bold",
  description:
    "Heavy black display type on white background. One accent-color emphasis word per scene. Recurring brand motifs as continuity glyphs. Mixed-weight editorial composition. Photo cutouts with stroke aura.",
  scenes: [
    "editorial-opener",
    "bold-statement",
    "numbered-diagram",
    "icon-list",
    "editorial-closer",
  ],
  tokens: {
    bg: "#FFFFFF",
    ink: "#0F0F0F",
    inkSupport: "#5A5A5A",
    accent: "auto", // resolved from BrandKit + design.accent
  },
  type: {
    display:
      '"SF Pro Display", "Inter Display", -apple-system, BlinkMacSystemFont, sans-serif',
    body: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    displayWeight: 800,
    bodyWeight: 500,
  },
  traits: {
    forceLightBg: true,
    displayTracking: -0.04,
  },
};
