// HalftoneOverlay — halftone dot pattern overlay. Vintage / editorial
// aesthetic. Static or animated (slow rotation). Cheap CSS-only —
// uses radial-gradient backgroundImage with tiled dots.

"use client";

import { interpolate, useCurrentFrame } from "remotion";

type Props = {
  // Dot color. Default near-black with low opacity.
  color?: string;
  // Background under the dots (transparent = layer above existing
  // content). Default transparent.
  background?: string;
  // Dot size in px. Default 3.
  dotSize?: number;
  // Distance between dot centers. Default 12.
  spacing?: number;
  // Animate slow rotation? Default false (static).
  rotate?: boolean;
  // Opacity of the whole overlay. Default 0.18.
  opacity?: number;
  // Mix-blend mode. Default "multiply" — works on light bgs.
  // For dark bgs use "screen".
  blend?: React.CSSProperties["mixBlendMode"];
};

export const HalftoneOverlay: React.FC<Props> = ({
  color = "rgba(0, 0, 0, 0.6)",
  background = "transparent",
  dotSize = 3,
  spacing = 12,
  rotate = false,
  opacity = 0.18,
  blend = "multiply",
}) => {
  const frame = useCurrentFrame();
  const angle = rotate ? interpolate(frame, [0, 360], [0, 360]) : 0;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background,
        backgroundImage: `radial-gradient(${color} ${dotSize / 2}px, transparent ${dotSize / 2 + 0.5}px)`,
        backgroundSize: `${spacing}px ${spacing}px`,
        opacity,
        mixBlendMode: blend,
        pointerEvents: "none",
        transform: rotate ? `rotate(${angle}deg) scale(1.4)` : "none",
      }}
    />
  );
};
