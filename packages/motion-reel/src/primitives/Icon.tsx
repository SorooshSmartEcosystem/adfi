// Icon — renders a curated SVG icon by name with optional draw-on
// animation. Companion to motion/icons/index.ts. Designed to slot
// into any scene without imposing layout (caller controls position
// via wrapper).
//
// Two render modes:
//   - static (default): shows the full icon immediately at the given
//     stroke. Best when the icon is a small accent that the viewer
//     should clock fast.
//   - drawOn: animates the path stroke from 0 to full over `drawFrames`
//     frames starting at `drawStart`. Reads as "the icon writes itself
//     onto the screen" — a common motion-design beat for a hero icon.

import { useCurrentFrame, interpolate, Easing } from "remotion";
import { ICONS, type IconName } from "../icons";

type Props = {
  name: IconName;
  // Pixel size of the icon (square). Default 96.
  size?: number;
  // Stroke color. Default currentColor (inherits CSS color).
  color?: string;
  // Stroke width in the 24×24 viewBox space. Default 2.
  strokeWidth?: number;
  // When true, paths animate from stroke-dashoffset N → 0 starting at
  // `drawStart` for `drawFrames` frames.
  drawOn?: boolean;
  drawStart?: number;
  drawFrames?: number;
};

export const Icon: React.FC<Props> = ({
  name,
  size = 96,
  color = "currentColor",
  strokeWidth = 2,
  drawOn = false,
  drawStart = 0,
  drawFrames = 18,
}) => {
  const paths = ICONS[name];
  const frame = useCurrentFrame();

  // For drawOn, we use a fixed dash array large enough that any path
  // length under it animates correctly. We can't measure path length
  // server-side without a DOM, so 1000 is the safety buffer — covers
  // every icon in our 24×24 set.
  const DASH = 1000;
  const progress = drawOn
    ? interpolate(frame, [drawStart, drawStart + drawFrames], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      })
    : 1;
  const dashOffset = drawOn ? DASH * (1 - progress) : 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block" }}
    >
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          strokeDasharray={drawOn ? DASH : undefined}
          strokeDashoffset={drawOn ? dashOffset : undefined}
        />
      ))}
    </svg>
  );
};
