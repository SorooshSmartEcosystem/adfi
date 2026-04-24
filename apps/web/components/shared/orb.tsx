type Size = "sm" | "md" | "lg" | "xl";

const SIZES: Record<Size, { wrap: string; ring: string }> = {
  sm: { wrap: "w-[16px] h-[16px]", ring: "-inset-[3px]" },
  md: { wrap: "w-[48px] h-[48px]", ring: "-inset-[6px]" },
  lg: { wrap: "w-[80px] h-[80px]", ring: "-inset-[10px]" },
  xl: { wrap: "w-[120px] h-[120px]", ring: "-inset-[12px]" },
};

// 3-D black orb taken from the prototype's Hire-Me hero. Radial gradient
// gives the highlight; the ring element pulses outward.
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
    <div className={`relative ${s.wrap} ${className}`}>
      <div
        className={`w-full h-full rounded-full ${animated ? "animate-orb-float" : ""}`}
        style={{
          background:
            "radial-gradient(circle at 35% 30%, #2a2a2a 0%, #050505 60%)",
        }}
      />
      {ring ? (
        <div
          className={`absolute ${s.ring} rounded-full border-hairline border-ink/10 ${animated ? "animate-orb-ring" : ""}`}
        />
      ) : null}
    </div>
  );
}
