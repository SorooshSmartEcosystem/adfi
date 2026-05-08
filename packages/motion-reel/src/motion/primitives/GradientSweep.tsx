// GradientSweep — animated gradient that sweeps diagonally across
// the frame. Cinematic accent for transitions, opening reveals,
// "spotlight" moments. The sweep is a diagonal soft-light gradient
// (warm or accent-colored) that travels from off-screen one corner
// to off-screen the opposite corner.
//
// Layered as the OUTERMOST overlay on a scene (positioned fixed +
// pointer-events: none) so it doesn't interfere with content.

"use client";

import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

type Direction = "diagonal-tl-br" | "diagonal-tr-bl" | "horizontal" | "vertical";

type Props = {
  // Color of the sweep band. Default warm white.
  color?: string;
  // Direction of travel. Default diagonal-tl-br.
  direction?: Direction;
  // Width of the sweep band as a percentage of frame. Default 35%.
  bandWidth?: number;
  // Opacity at peak. Default 0.4.
  intensity?: number;
  // Speed multiplier. 1.0 = sweep takes whole scene. 0.5 = sweeps
  // twice. Default 1.0.
  speed?: number;
  // Frame to start the sweep. Default 0.
  startFrame?: number;
};

export const GradientSweep: React.FC<Props> = ({
  color = "rgba(255, 255, 255, 0.55)",
  direction = "diagonal-tl-br",
  bandWidth = 35,
  intensity = 0.4,
  speed = 1.0,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Position progresses 0 → 1 over the scene (× speed). At 0 the
  // band is fully off-screen leading edge; at 1 fully off-screen
  // trailing edge.
  const t = interpolate(
    (frame - startFrame) * speed,
    [0, durationInFrames],
    [-bandWidth, 100 + bandWidth],
    {
      easing: Easing.inOut(Easing.ease),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  let gradient: string;
  switch (direction) {
    case "diagonal-tl-br":
      gradient = `linear-gradient(135deg, transparent ${t - bandWidth}%, ${color} ${t}%, transparent ${t + bandWidth}%)`;
      break;
    case "diagonal-tr-bl":
      gradient = `linear-gradient(225deg, transparent ${t - bandWidth}%, ${color} ${t}%, transparent ${t + bandWidth}%)`;
      break;
    case "horizontal":
      gradient = `linear-gradient(90deg, transparent ${t - bandWidth}%, ${color} ${t}%, transparent ${t + bandWidth}%)`;
      break;
    case "vertical":
      gradient = `linear-gradient(180deg, transparent ${t - bandWidth}%, ${color} ${t}%, transparent ${t + bandWidth}%)`;
      break;
    default:
      gradient = "transparent";
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: gradient,
        opacity: intensity,
        mixBlendMode: "soft-light",
        pointerEvents: "none",
      }}
    />
  );
};
