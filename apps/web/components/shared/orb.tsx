// The 3D black orb — single source of truth.
// Spec lives in /prototype/ADFI_BrandKit.html (the "hero-orb"). Multi-stop
// radial gradient for the body, large soft top-left highlight, smaller
// secondary glow at bottom-right for depth, optional ring + float anim.

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const SIZES: Record<
  Size,
  {
    wrap: string;
    ring: string;
    highlight: string; // top-left primary highlight
    glow: string; // bottom-right subtle reflection
  }
> = {
  xs: {
    wrap: "w-[14px] h-[14px]",
    ring: "-inset-[2px]",
    highlight: "top-[2px] left-[3px] w-[4px] h-[3px]",
    glow: "bottom-[2px] right-[3px] w-[3px] h-[2px]",
  },
  sm: {
    wrap: "w-[22px] h-[22px]",
    ring: "-inset-[3px]",
    highlight: "top-[3px] left-[5px] w-[6px] h-[4px]",
    glow: "bottom-[3px] right-[4px] w-[5px] h-[3px]",
  },
  md: {
    wrap: "w-[52px] h-[52px]",
    ring: "-inset-[6px]",
    highlight: "top-[8px] left-[11px] w-[14px] h-[10px]",
    glow: "bottom-[7px] right-[9px] w-[12px] h-[8px]",
  },
  lg: {
    wrap: "w-[88px] h-[88px]",
    ring: "-inset-[10px]",
    highlight: "top-[14px] left-[19px] w-[22px] h-[16px]",
    glow: "bottom-[12px] right-[16px] w-[18px] h-[12px]",
  },
  xl: {
    wrap: "w-[160px] h-[160px]",
    ring: "-inset-[14px]",
    highlight: "top-[28px] left-[36px] w-[40px] h-[28px]",
    glow: "bottom-[20px] right-[28px] w-[32px] h-[22px]",
  },
};

export function Orb({
  size = "md",
  animated = true,
  ring = true,
  className = "",
}: {
  size?: Size;
  animated?: boolean;
  ring?: boolean;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <div className={`relative ${s.wrap} shrink-0 ${className}`}>
      <div
        className={`relative w-full h-full rounded-full overflow-hidden ${animated ? "animate-orb-float" : ""}`}
        style={{
          background:
            "radial-gradient(circle at 30% 25%, #5a5a5a 0%, #2a2a2a 35%, #0a0a0a 75%, #000 100%)",
          boxShadow:
            "inset -2px -3px 8px rgba(0,0,0,0.55), inset 2px 2px 4px rgba(255,255,255,0.05), 0 8px 22px rgba(0,0,0,0.22)",
        }}
      >
        <span
          className={`absolute rounded-full ${s.highlight}`}
          style={{
            background:
              "radial-gradient(ellipse, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.05) 55%, transparent 75%)",
            transform: "rotate(-25deg)",
            filter: "blur(0.5px)",
          }}
        />
        <span
          className={`absolute rounded-full ${s.glow}`}
          style={{
            background:
              "radial-gradient(ellipse, rgba(255,255,255,0.10) 0%, transparent 70%)",
          }}
        />
      </div>
      {ring ? (
        <div
          className={`absolute ${s.ring} rounded-full border-hairline border-ink/10 ${animated ? "animate-orb-ring" : ""}`}
        />
      ) : null}
    </div>
  );
}
