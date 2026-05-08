// BracketCorners — four animated corner brackets that frame a
// region of the scene. Used as a visual emphasis around a key
// element ("focus on this") or as a technical / engineering
// aesthetic flourish.

"use client";

import { Easing, interpolate, useCurrentFrame } from "remotion";

type Props = {
  // Bracket arm length in px. Default 40.
  armLength?: number;
  // Bracket stroke width. Default 3.
  thickness?: number;
  // Color. Default currentColor.
  color?: string;
  // Inset from frame edge in px. Default 80.
  inset?: number;
  // Frame to start drawing. Default 0.
  startFrame?: number;
  // Frames to fully draw. Default 14.
  durationFrames?: number;
  // Show bottom-left + bottom-right brackets. Default true. Set
  // false for top-only brackets (header treatment).
  bottomCorners?: boolean;
};

export const BracketCorners: React.FC<Props> = ({
  armLength = 40,
  thickness = 3,
  color = "currentColor",
  inset = 80,
  startFrame = 0,
  durationFrames = 14,
  bottomCorners = true,
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
  const len = armLength * t;

  // Corner = two perpendicular line segments.
  const Corner = ({
    style,
    flipH,
    flipV,
  }: {
    style: React.CSSProperties;
    flipH?: boolean;
    flipV?: boolean;
  }) => (
    <div style={{ position: "absolute", ...style, width: armLength, height: armLength }}>
      <div
        style={{
          position: "absolute",
          [flipH ? "right" : "left"]: 0,
          [flipV ? "bottom" : "top"]: 0,
          width: len,
          height: thickness,
          background: color,
        }}
      />
      <div
        style={{
          position: "absolute",
          [flipH ? "right" : "left"]: 0,
          [flipV ? "bottom" : "top"]: 0,
          width: thickness,
          height: len,
          background: color,
        }}
      />
    </div>
  );

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <Corner style={{ top: inset, left: inset }} />
      <Corner style={{ top: inset, right: inset }} flipH />
      {bottomCorners ? (
        <>
          <Corner style={{ bottom: inset, left: inset }} flipV />
          <Corner style={{ bottom: inset, right: inset }} flipH flipV />
        </>
      ) : null}
    </div>
  );
};
