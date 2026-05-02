// Icon registry — single SVG path strings keyed by name. Curated to
// cover the common topics ADFI's solopreneur users post about
// (commerce, growth, alerts, social, misc) without ballooning the
// bundle. Each icon is designed for a 24×24 viewBox stroked at width
// 2 so the renderer can scale them up to any display size while
// preserving the stroke weight.
//
// Add icons by editing this map. Keep paths simple (1-3 path d values)
// so DrawSVG can animate them in without measuring complex geometry.
//
// Why a curated icon set instead of an external library: predictable
// bundle size, deterministic visual style (all 24×24, 2px stroke,
// rounded line caps), and renders identically in Lambda Chromium.
// External libraries like Lucide bring 1000+ icons we'd never use.

export type IconName =
  | "dollar"
  | "percent"
  | "trending-up"
  | "trending-down"
  | "chart-bar"
  | "chart-line"
  | "coin"
  | "wallet"
  | "credit-card"
  | "bank"
  | "rocket"
  | "target"
  | "sparkle"
  | "lightbulb"
  | "alert"
  | "fire"
  | "lightning"
  | "check"
  | "x"
  | "heart"
  | "message"
  | "share"
  | "users"
  | "bookmark"
  | "globe"
  | "clock"
  | "calendar"
  | "mail"
  | "phone"
  | "lock"
  | "shield"
  | "search"
  | "star"
  | "play"
  | "pause"
  | "arrow-right"
  | "arrow-up"
  | "arrow-down";

// Each entry is one or more SVG `path d` strings. Drawn with stroke
// only (no fill) at the caller's chosen color and stroke width.
export const ICONS: Record<IconName, string[]> = {
  // ── finance / commerce ─────────────────────────────────────────
  dollar: ["M12 2v20", "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"],
  percent: ["M19 5L5 19", "M6.5 6.5h.01", "M17.5 17.5h.01"],
  "trending-up": ["M22 7L13.5 15.5l-5-5L2 17", "M16 7h6v6"],
  "trending-down": ["M22 17L13.5 8.5l-5 5L2 7", "M16 17h6v-6"],
  "chart-bar": ["M3 21V10", "M9 21V14", "M15 21V6", "M21 21V3", "M3 21h18"],
  "chart-line": [
    "M3 3v18h18",
    "M7 14l4-4 3 3 7-7",
    "M14 6h4v4",
  ],
  coin: [
    "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z",
    "M9 9h4a2 2 0 0 1 0 4H9v3h5",
    "M12 6v3",
    "M12 16v3",
  ],
  wallet: [
    "M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1",
    "M21 12h-4a2 2 0 0 0 0 4h4z",
  ],
  "credit-card": [
    "M3 6h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z",
    "M2 11h20",
    "M6 15h2",
  ],
  bank: [
    "M3 21h18",
    "M3 10h18",
    "M5 6l7-4 7 4",
    "M6 10v11",
    "M10 10v11",
    "M14 10v11",
    "M18 10v11",
  ],

  // ── growth / momentum ──────────────────────────────────────────
  rocket: [
    "M5 13a8 8 0 0 1 11-7c1 .5 2 1 3 2l-7 7-7-2z",
    "M9 17l-3 3",
    "M14 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  ],
  target: [
    "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z",
    "M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z",
    "M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  ],
  sparkle: [
    "M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z",
    "M19 19l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z",
  ],
  lightbulb: [
    "M9 18h6",
    "M10 22h4",
    "M12 2a7 7 0 0 0-4 13c1 .8 1.5 1.5 1.5 3h5c0-1.5.5-2.2 1.5-3a7 7 0 0 0-4-13z",
  ],

  // ── alerts / urgency ───────────────────────────────────────────
  alert: [
    "M12 2L2 21h20L12 2z",
    "M12 9v5",
    "M12 17.5h.01",
  ],
  fire: [
    "M12 2c0 4-4 4-4 8a4 4 0 0 0 4 4 4 4 0 0 0 4-4c0-2-1-3-1-5",
    "M9 14a3 3 0 0 0 6 0",
  ],
  lightning: ["M13 2L3 14h7l-1 8 10-12h-7l1-8z"],

  // ── status ─────────────────────────────────────────────────────
  check: ["M4 12l5 5L20 6"],
  x: ["M6 6l12 12", "M6 18L18 6"],

  // ── social ─────────────────────────────────────────────────────
  heart: [
    "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z",
  ],
  message: [
    "M21 12a8 8 0 1 1-4-7l4-1-1 4a8 8 0 0 1 1 4z",
  ],
  share: [
    "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8",
    "M16 6l-4-4-4 4",
    "M12 2v14",
  ],
  users: [
    "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    "M17 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    "M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2",
    "M22 21v-2a4 4 0 0 0-3-3.87",
  ],
  bookmark: ["M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"],

  // ── misc ───────────────────────────────────────────────────────
  globe: [
    "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z",
    "M2 12h20",
    "M12 2c2.5 3 4 6.5 4 10s-1.5 7-4 10c-2.5-3-4-6.5-4-10s1.5-7 4-10z",
  ],
  clock: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 6v6l4 2"],
  calendar: [
    "M3 6h18v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6z",
    "M3 10h18",
    "M8 3v4",
    "M16 3v4",
  ],
  mail: [
    "M2 7l10 7 10-7",
    "M2 7v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7H2z",
  ],
  phone: [
    "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z",
  ],
  lock: [
    "M5 11h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z",
    "M8 11V7a4 4 0 0 1 8 0v4",
  ],
  shield: ["M12 22s8-4 8-12V4l-8-2-8 2v6c0 8 8 12 8 12z"],
  search: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z", "M21 21l-5.6-5.6"],
  star: [
    "M12 2l3 7h7l-5.5 4 2 7-6.5-4-6.5 4 2-7L2 9h7l3-7z",
  ],
  play: ["M6 4l14 8-14 8V4z"],
  pause: ["M6 4h4v16H6z", "M14 4h4v16h-4z"],
  "arrow-right": ["M5 12h14", "M13 5l7 7-7 7"],
  "arrow-up": ["M12 19V5", "M5 12l7-7 7 7"],
  "arrow-down": ["M12 5v14", "M5 12l7 7 7-7"],
};

// Category lookup — used by the agent prompt to surface icon options
// per scene topic. Keeping this here rather than in the prompt itself
// means the registry stays the single source of truth.
export const ICON_CATEGORIES: Record<string, IconName[]> = {
  finance: [
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
  ],
  growth: ["rocket", "target", "sparkle", "lightbulb", "trending-up", "star"],
  alert: ["alert", "fire", "lightning", "x"],
  social: ["heart", "message", "share", "users", "bookmark"],
  misc: [
    "globe",
    "clock",
    "calendar",
    "mail",
    "phone",
    "lock",
    "shield",
    "search",
    "play",
    "check",
    "arrow-right",
    "arrow-up",
    "arrow-down",
  ],
};

export function isIconName(value: string | undefined): value is IconName {
  if (!value) return false;
  return value in ICONS;
}
