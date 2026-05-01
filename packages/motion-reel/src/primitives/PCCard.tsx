// PCCard — direct port of the landing-page meet-the-team phone-card
// aesthetic. Rounded white card on a cream background with a hairline
// border + soft shadow. Cards fade up + slide up on entrance, matching
// the landing scenes' choreography.

import { useCurrentFrame, interpolate, Easing } from "remotion";

export type PCCardVariant = "default" | "dark" | "amber" | "alive";

type Props = {
  startFrame: number;
  variant?: PCCardVariant;
  children: React.ReactNode;
  // Fixed width so card content lays out predictably across composition
  // sizes. Default 880px fits the 1080-wide frame with 100px gutters.
  width?: number;
  style?: React.CSSProperties;
};

const VARIANT_BG: Record<PCCardVariant, string> = {
  default: "#FFFFFF",
  dark: "#111111",
  amber: "#FFF9ED",
  alive: "#F0FBE9",
};

const VARIANT_BORDER: Record<PCCardVariant, string> = {
  default: "#E5E3DB",
  dark: "#2A2A2A",
  amber: "#F0D98C",
  alive: "#A4DC95",
};

const VARIANT_TEXT: Record<PCCardVariant, string> = {
  default: "#111111",
  dark: "#FFFFFF",
  amber: "#1A1A1A",
  alive: "#1A1A1A",
};

export function PCCard({
  startFrame,
  variant = "default",
  children,
  width = 880,
  style,
}: Props) {
  const frame = useCurrentFrame();
  const local = frame - startFrame;

  const opacity = interpolate(local, [0, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const ty = interpolate(local, [0, 16], [22, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      style={{
        width,
        background: VARIANT_BG[variant],
        color: VARIANT_TEXT[variant],
        border: `1px solid ${VARIANT_BORDER[variant]}`,
        borderRadius: 24,
        padding: "32px 36px",
        boxShadow:
          variant === "dark"
            ? "0 24px 48px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)"
            : "0 18px 36px rgba(17,17,17,0.06)",
        opacity,
        transform: `translateY(${ty}px)`,
        willChange: "opacity, transform",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
