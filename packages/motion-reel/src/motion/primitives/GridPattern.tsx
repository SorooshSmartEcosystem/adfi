// GridPattern — animated grid backdrop. Fine lines forming a grid,
// optionally drifting or pulsing. Use as a background for tech /
// data / SaaS scenes (dashboard-tech preset's natural backdrop).
//
// Two flavors:
//   - static-fade: grid fades in over first 14 frames, holds
//   - drift:       grid slowly drifts diagonally (subtle dynamism)

"use client";

import { interpolate, useCurrentFrame } from "remotion";

type Props = {
  // Cell size in px. Default 80.
  cellSize?: number;
  // Line thickness. Default 1.
  thickness?: number;
  // Line color. Default low-opacity ink.
  color?: string;
  // Background color UNDER the grid (e.g. dashboard-tech bg).
  background?: string;
  // Fade in or drift continuously. Default "static-fade".
  flavor?: "static-fade" | "drift";
  // Opacity at full visible. Default 0.18.
  opacity?: number;
};

export const GridPattern: React.FC<Props> = ({
  cellSize = 80,
  thickness = 1,
  color = "rgba(255, 255, 255, 0.18)",
  background = "transparent",
  flavor = "static-fade",
  opacity = 0.18,
}) => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Diagonal drift on the grid background-position.
  const drift = flavor === "drift" ? (frame / 30) * 8 : 0;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background,
        backgroundImage: `
          linear-gradient(${color} ${thickness}px, transparent ${thickness}px),
          linear-gradient(90deg, ${color} ${thickness}px, transparent ${thickness}px)
        `,
        backgroundSize: `${cellSize}px ${cellSize}px`,
        backgroundPosition: `${drift}px ${drift}px`,
        opacity: fade * opacity,
        pointerEvents: "none",
      }}
    />
  );
};
