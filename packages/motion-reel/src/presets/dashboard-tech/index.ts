// dashboard-tech preset — dark-mode terminal aesthetic for fintech /
// SaaS / AI / dev / data / crypto brands. The brief: same scene
// CHOREOGRAPHY as editorial-bold, fundamentally different VISUAL
// WORLD. Deep ink background, monospace accents, cyan/amber emphasis,
// high-contrast type. Reads as "the dashboard the founder actually
// uses" rather than "the editorial pull-quote on a white page."
//
// Why no new scene components: the renderer already dispatches every
// scene type from BrandTokens. Overriding the tokens at render time
// (via applyPresetTokens) gives us a completely new visual world
// without writing 5 new React components per preset. When we later
// build dashboard-tech-specific scenes (terminal frame chrome,
// animated line charts), they'll layer on top of this base.
//
// Best fit:
//   - Fintech / crypto / trading
//   - SaaS / dev tools / API
//   - Data / analytics / AI products
//   - Anything where "dark mode terminal" reads as the brand's home
//
// What this preset is NOT for:
//   - Wellness / family / soft brands → soft-minimal
//   - Luxury / hospitality → luxury
//   - Craft / makers / food → studio-craft

import type { Preset } from "../types";

export const dashboardTechPreset: Preset = {
  name: "dashboard-tech",
  description:
    "Dark-mode terminal aesthetic. Deep ink background, monospace accents, cyan/amber emphasis. For fintech, SaaS, AI, data, and dev brands.",
  scenes: [
    "editorial-opener",
    "bold-statement",
    "icon-list",
    "editorial-closer",
    "metric-tile-grid",
    "phone-mockup",
    "hero-photo",
  ],
  tokens: {
    // Deep slate ink — not pure black so the cyan and amber accents
    // glow rather than sit flat.
    bg: "#0A0E14",
    // Bright but not white — softer on screen, easier to read for
    // long body text.
    ink: "#E8EDF3",
    // Muted secondary text. Same hue as ink, lower saturation.
    inkSupport: "#7A8694",
    // Default accent stays "auto" so it picks from BrandKit. The
    // resolver bumps saturation +20% on dashboard-tech so the accent
    // pops on the dark background.
    accent: "auto",
  },
  type: {
    // Display stays heavy sans for the hero text — readable on dark.
    // Mono is reserved for support labels (statusLabel, hookLabel,
    // tile labels) where the terminal aesthetic earns its place.
    display:
      '"SF Pro Display", "Inter Display", -apple-system, BlinkMacSystemFont, sans-serif',
    body:
      '"JetBrains Mono", "SF Mono", "Menlo", ui-monospace, monospace',
    displayWeight: 800,
    bodyWeight: 500,
  },
  traits: {
    // Dark bg is the whole point of this preset — preset resolver
    // honors this on top of any design.style override.
    forceLightBg: false,
    // Slightly looser than editorial-bold's tight -0.04. Display on
    // dark needs more breathing room or letters fuse.
    displayTracking: -0.02,
  },
};
