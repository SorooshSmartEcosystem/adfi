// AccentRule — animated horizontal or vertical decorative rule
// (line). Six styles. Useful as a visual anchor above/below text,
// or as a divider between scene sections. Stroke-based, brand
// accent color by default.
//
// Six styles:
//   - draw-h     — horizontal line draws left → right
//   - draw-v     — vertical line draws top → bottom
//   - dot-rule   — line with dot at midpoint that pulses
//   - dashed     — dashed line draws in
//   - double     — two parallel lines (editorial style)
//   - tick-marks — line with tick marks at intervals (technical)

"use client";

import { Easing, interpolate, useCurrentFrame } from "remotion";

type Style = "draw-h" | "draw-v" | "dot-rule" | "dashed" | "double" | "tick-marks";

type Props = {
  style?: Style;
  color?: string;
  // Length in px. Default 200.
  length?: number;
  // Stroke width. Default 2.
  thickness?: number;
  // Frame to start drawing. Default 0.
  startFrame?: number;
  // Frames to complete the draw. Default 16.
  durationFrames?: number;
  // Inline style for positioning the rule.
  containerStyle?: React.CSSProperties;
};

export const AccentRule: React.FC<Props> = ({
  style = "draw-h",
  color = "currentColor",
  length = 200,
  thickness = 2,
  startFrame = 0,
  durationFrames = 16,
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

  if (style === "draw-h") {
    return (
      <div
        style={{
          width: length * t,
          height: thickness,
          background: color,
          ...containerStyle,
        }}
      />
    );
  }
  if (style === "draw-v") {
    return (
      <div
        style={{
          width: thickness,
          height: length * t,
          background: color,
          ...containerStyle,
        }}
      />
    );
  }
  if (style === "dot-rule") {
    const pulse = interpolate(
      frame,
      [startFrame + durationFrames, startFrame + durationFrames + 30],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
    return (
      <div
        style={{
          position: "relative",
          width: length * t,
          height: thickness,
          background: color,
          ...containerStyle,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 8 * pulse,
            height: 8 * pulse,
            borderRadius: "50%",
            background: color,
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>
    );
  }
  if (style === "dashed") {
    return (
      <div
        style={{
          width: length * t,
          height: thickness,
          backgroundImage: `repeating-linear-gradient(90deg, ${color} 0 8px, transparent 8px 14px)`,
          ...containerStyle,
        }}
      />
    );
  }
  if (style === "double") {
    return (
      <div
        style={{
          width: length * t,
          height: thickness * 3 + 4,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          ...containerStyle,
        }}
      >
        <div style={{ width: "100%", height: thickness, background: color }} />
        <div style={{ width: "100%", height: thickness, background: color }} />
      </div>
    );
  }
  if (style === "tick-marks") {
    const ticks = 5;
    return (
      <div
        style={{
          position: "relative",
          width: length * t,
          height: thickness * 4,
          ...containerStyle,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            height: thickness,
            background: color,
            transform: "translateY(-50%)",
          }}
        />
        {Array.from({ length: ticks }, (_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${(i / (ticks - 1)) * 100}%`,
              top: 0,
              bottom: 0,
              width: thickness,
              background: color,
              opacity: t > i / ticks ? 1 : 0,
            }}
          />
        ))}
      </div>
    );
  }
  return null;
};
