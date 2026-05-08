// VignettePulse — soft radial vignette that breathes in and out
// over the scene. Adds cinematic depth + draws the eye toward the
// center without being literal "darken edges" film treatment.
//
// Cheap to render: a single absolutely-positioned radial gradient
// with animated opacity. Layered as the OUTERMOST overlay (above
// content but with pointer-events: none).

"use client";

import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

type Props = {
  // Vignette color. Default near-black.
  color?: string;
  // Inner radius (% of frame) where the vignette starts. Default 40%.
  innerRadius?: number;
  // Peak opacity. Default 0.5.
  intensity?: number;
  // Pulse rate — how many full breaths per scene. Default 0.5
  // (one breath in, one breath out across the whole scene).
  rate?: number;
  // Static (no breathe) — just constant vignette darkening.
  // Default false.
  static?: boolean;
};

export const VignettePulse: React.FC<Props> = ({
  color = "rgba(0, 0, 0, 1)",
  innerRadius = 40,
  intensity = 0.5,
  rate = 0.5,
  static: isStatic = false,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Sine wave breathing. Maps frame → 0..1 → 0 over the scene.
  const phase = isStatic
    ? 1
    : Math.abs(
        Math.sin((frame / durationInFrames) * Math.PI * 2 * rate),
      );
  const opacity = phase * intensity;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(circle at center, transparent ${innerRadius}%, ${color} 100%)`,
        opacity,
        pointerEvents: "none",
        mixBlendMode: "multiply",
      }}
    />
  );
};
