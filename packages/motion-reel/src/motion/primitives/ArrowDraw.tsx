// ArrowDraw — animated arrow that draws itself from start to end
// point with a head appearing at the end. Use to point at content,
// emphasize relationships, mark beats. Three styles: straight,
// curved, dashed.

"use client";

import { Easing, interpolate, useCurrentFrame } from "remotion";

type Style = "straight" | "curved" | "dashed";

type Props = {
  // Start coordinates as % of viewport (0-100).
  fromX: number;
  fromY: number;
  // End coordinates as % of viewport.
  toX: number;
  toY: number;
  style?: Style;
  color?: string;
  thickness?: number;
  // Frames to draw. Default 18.
  durationFrames?: number;
  // Frame to start drawing. Default 0.
  startFrame?: number;
  // Show arrowhead. Default true.
  arrowhead?: boolean;
  // Inline style for the wrapper svg.
  containerStyle?: React.CSSProperties;
};

export const ArrowDraw: React.FC<Props> = ({
  fromX,
  fromY,
  toX,
  toY,
  style = "straight",
  color = "currentColor",
  thickness = 3,
  durationFrames = 18,
  startFrame = 0,
  arrowhead = true,
  containerStyle,
}) => {
  const frame = useCurrentFrame();
  const t = interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // Compute path based on style.
  let pathD: string;
  if (style === "curved") {
    const cx = (fromX + toX) / 2;
    const cy = Math.min(fromY, toY) - 20;
    pathD = `M ${fromX} ${fromY} Q ${cx} ${cy} ${toX} ${toY}`;
  } else {
    pathD = `M ${fromX} ${fromY} L ${toX} ${toY}`;
  }

  // Use stroke-dasharray for the draw animation.
  const totalLength = Math.hypot(toX - fromX, toY - fromY) * 1.5;
  const dashArr = style === "dashed" ? "4 3" : `${totalLength} ${totalLength}`;
  const dashOff = style === "dashed" ? 0 : totalLength * (1 - t);

  // Arrowhead position + rotation.
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  const headOpacity = interpolate(
    frame,
    [startFrame + durationFrames - 4, startFrame + durationFrames + 2],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        ...containerStyle,
      }}
    >
      <path
        d={pathD}
        stroke={color}
        strokeWidth={thickness * 0.05}
        fill="none"
        strokeDasharray={dashArr}
        strokeDashoffset={dashOff}
        strokeLinecap="round"
        opacity={style === "dashed" ? t : 1}
      />
      {arrowhead ? (
        <g
          transform={`translate(${toX} ${toY}) rotate(${angle})`}
          opacity={headOpacity}
        >
          <polygon
            points="0,0 -2.5,-1.5 -2.5,1.5"
            fill={color}
          />
        </g>
      ) : null}
    </svg>
  );
};
