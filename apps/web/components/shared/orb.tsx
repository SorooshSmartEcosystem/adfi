type Size = "sm" | "md" | "lg" | "xl";

const SIZES: Record<Size, { wrap: string; ring: string; highlight: string }> = {
  sm: {
    wrap: "w-[18px] h-[18px]",
    ring: "-inset-[3px]",
    highlight: "top-[3px] left-[4px] w-[5px] h-[5px]",
  },
  md: {
    wrap: "w-[52px] h-[52px]",
    ring: "-inset-[6px]",
    highlight: "top-[8px] left-[12px] w-[12px] h-[12px]",
  },
  lg: {
    wrap: "w-[88px] h-[88px]",
    ring: "-inset-[10px]",
    highlight: "top-[14px] left-[22px] w-[18px] h-[18px]",
  },
  xl: {
    wrap: "w-[132px] h-[132px]",
    ring: "-inset-[12px]",
    highlight: "top-[20px] left-[32px] w-[26px] h-[26px]",
  },
};

// 3-D black orb modelled on the prototype Hire-Me hero: deep radial
// gradient for body, explicit specular highlight, optional pulsing ring.
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
            "radial-gradient(circle at 35% 30%, #4a4a4a 0%, #1a1a1a 45%, #000 100%)",
          boxShadow:
            "inset 0 -2px 6px rgba(0,0,0,0.6), 0 6px 18px rgba(0,0,0,0.25)",
        }}
      >
        <span
          className={`absolute rounded-full ${s.highlight}`}
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.1) 60%, transparent 100%)",
            filter: "blur(0.5px)",
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
