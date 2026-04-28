import type { NavIcon } from "./nav-config";

// Single-stroke line glyphs sized to match 13–14px sidebar text. Stroke
// inherits color from the parent (active links are white-on-ink, idle
// are ink2). No fills, no decoration — geometric primitives only.

const COMMON = {
  width: 16,
  height: 16,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const GLYPHS: Record<NavIcon, React.ReactElement> = {
  // dashboard — 4 squares grid
  dashboard: (
    <g>
      <rect x="2.5" y="2.5" width="4.5" height="4.5" />
      <rect x="9" y="2.5" width="4.5" height="4.5" />
      <rect x="2.5" y="9" width="4.5" height="4.5" />
      <rect x="9" y="9" width="4.5" height="4.5" />
    </g>
  ),
  // inbox — tray with envelope V
  inbox: (
    <g>
      <path d="M2 9v3.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9" />
      <path d="M2 9h3.5l1.2 1.5h2.6l1.2-1.5H14" />
      <path d="M2 9l1.5-5a1 1 0 0 1 1-.7h7a1 1 0 0 1 1 .7L14 9" />
    </g>
  ),
  // content — rectangle with text lines
  content: (
    <g>
      <rect x="2.5" y="2.5" width="11" height="11" rx="1" />
      <path d="M5 6h6" />
      <path d="M5 9h6" />
      <path d="M5 11.5h3.5" />
    </g>
  ),
  // brandkit — palette-ish circle + dot
  brandkit: (
    <g>
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="5.5" cy="6" r="0.8" fill="currentColor" />
      <circle cx="10.5" cy="6" r="0.8" fill="currentColor" />
      <circle cx="10.5" cy="10" r="0.8" fill="currentColor" />
    </g>
  ),
  // report — bar chart
  report: (
    <g>
      <path d="M2.5 13.5h11" />
      <rect x="3.5" y="9" width="2.2" height="4" />
      <rect x="6.9" y="6" width="2.2" height="7" />
      <rect x="10.3" y="3" width="2.2" height="10" />
    </g>
  ),
  // settings — gear simplified to circle + 6 ticks
  settings: (
    <g>
      <circle cx="8" cy="8" r="2.2" />
      <path d="M8 1.5v2M8 12.5v2M14.5 8h-2M3.5 8h-2M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4M12.6 12.6l-1.4-1.4M4.8 4.8l-1.4-1.4" />
    </g>
  ),
  // strategist — compass rose
  strategist: (
    <g>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 5l1.4 2.6L8 11l-1.4-3.4z" />
    </g>
  ),
  // signal — concentric arcs (broadcast)
  signal: (
    <g>
      <path d="M3 11.5a8 8 0 0 1 10 0" />
      <path d="M5 9.5a5 5 0 0 1 6 0" />
      <path d="M7 7.5a2 2 0 0 1 2 0" />
      <circle cx="8" cy="11.5" r="0.8" fill="currentColor" />
    </g>
  ),
  // echo — speech bubble
  echo: (
    <g>
      <path d="M2.5 7.5a4.5 4.5 0 0 1 4.5-4.5h2a4.5 4.5 0 1 1 0 9H7l-3 2.5v-2.7a4.5 4.5 0 0 1-1.5-3.3z" />
    </g>
  ),
  // scout — magnifier
  scout: (
    <g>
      <circle cx="7" cy="7" r="4" />
      <path d="M10 10l3 3" />
    </g>
  ),
  // pulse — ECG line
  pulse: (
    <g>
      <path d="M2 8h2.5l1.5-3 2 6 1.7-4 1.3 2H14" />
    </g>
  ),
};

export function NavIconGlyph({ name }: { name: NavIcon }) {
  return (
    <svg {...COMMON} className="shrink-0">
      {GLYPHS[name]}
    </svg>
  );
}
