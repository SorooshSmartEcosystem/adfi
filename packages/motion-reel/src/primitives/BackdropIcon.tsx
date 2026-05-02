// BackdropIcon — giant outline icon sitting behind a scene's hero
// text at very low opacity. Fills the negative space so the frame
// reads as "designed" rather than "text on a wash" without dominating
// the eye. Stays minimal: 1px stroke at the icon's natural ratio,
// 4-8% opacity, color pulled from the scene's accent or ink token.
//
// Caller positions this absolutely; this component handles size +
// opacity + corner anchor.

import { Icon } from "./Icon";
import type { IconName } from "../icons";

type Props = {
  name: IconName;
  // Pixel size — defaults to a frame-filling 1100 (slightly larger
  // than the 1080-wide canvas so the icon's bounding box can extend
  // past the safe area for visual interest).
  size?: number;
  color?: string;
  // 0..1, default 0.06. Higher reads as decorative; lower as ghost.
  opacity?: number;
  // Anchor — the corner of the scene the icon hugs. Default
  // "center". Use "tr" or "br" to bleed off the edge.
  anchor?: "center" | "tl" | "tr" | "bl" | "br";
};

export const BackdropIcon: React.FC<Props> = ({
  name,
  size = 1100,
  color = "currentColor",
  opacity = 0.06,
  anchor = "center",
}) => {
  const positionStyle: React.CSSProperties =
    anchor === "center"
      ? {
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }
      : anchor === "tl"
        ? { top: -size * 0.2, left: -size * 0.15 }
        : anchor === "tr"
          ? { top: -size * 0.2, right: -size * 0.15 }
          : anchor === "bl"
            ? { bottom: -size * 0.2, left: -size * 0.15 }
            : { bottom: -size * 0.2, right: -size * 0.15 };

  return (
    <div
      style={{
        position: "absolute",
        ...positionStyle,
        width: size,
        height: size,
        opacity,
        pointerEvents: "none",
        color,
      }}
    >
      <Icon name={name} size={size} color={color} strokeWidth={1} />
    </div>
  );
};
