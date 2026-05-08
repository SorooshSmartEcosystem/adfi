// SlidePanel — full-bleed colored panel slides in from a chosen
// direction. Used as scene transition / accent backdrop / dramatic
// emphasis. Direction + color configurable; can be the SCENE
// background or an OVERLAY layer.

"use client";

import { Easing, interpolate, useCurrentFrame } from "remotion";

type Direction = "left" | "right" | "top" | "bottom";

type Props = {
  // Direction the panel slides FROM.
  direction?: Direction;
  // Panel color. Default brand ink.
  color?: string;
  // How much of the frame the panel covers when fully in. 0-1.
  // Default 1 (full coverage).
  coverage?: number;
  // Frames to slide in. Default 16.
  durationFrames?: number;
  // Frame to start. Default 0.
  startFrame?: number;
  // If true, panel slides OUT after it slides IN. Frames the panel
  // holds at full coverage. Default 0 (stays in indefinitely).
  holdFrames?: number;
  // Children rendered ON TOP of the panel (when fully visible).
  children?: React.ReactNode;
};

export const SlidePanel: React.FC<Props> = ({
  direction = "left",
  color = "#0F0F0F",
  coverage = 1,
  durationFrames = 16,
  startFrame = 0,
  holdFrames = 0,
  children,
}) => {
  const frame = useCurrentFrame();
  const elapsed = frame - startFrame;

  // Slide-in phase: 0 → 1 over durationFrames.
  let t = interpolate(elapsed, [0, durationFrames], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Slide-out phase if holdFrames > 0.
  if (holdFrames > 0) {
    const outStart = durationFrames + holdFrames;
    const outProgress = interpolate(
      elapsed,
      [outStart, outStart + durationFrames],
      [0, 1],
      {
        easing: Easing.in(Easing.cubic),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    );
    t = t - outProgress;
  }

  let transform: string;
  switch (direction) {
    case "left":
      transform = `translateX(${(1 - t) * -100}%)`;
      break;
    case "right":
      transform = `translateX(${(1 - t) * 100}%)`;
      break;
    case "top":
      transform = `translateY(${(1 - t) * -100}%)`;
      break;
    case "bottom":
    default:
      transform = `translateY(${(1 - t) * 100}%)`;
      break;
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transform,
        background: color,
        opacity: coverage,
        pointerEvents: "none",
      }}
    >
      {children}
    </div>
  );
};
