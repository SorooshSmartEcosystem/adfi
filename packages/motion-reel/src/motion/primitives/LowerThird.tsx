// LowerThird — documentary-style caption at the bottom of the
// frame. Slides in from the bottom with primary line + optional
// subtitle line + optional accent bar to the left. Used for
// captioning a person/brand/source in a video moment.

"use client";

import { Easing, interpolate, useCurrentFrame } from "remotion";

type Props = {
  // Primary line (large). e.g. business name, person's name.
  primary: string;
  // Optional secondary line (small mono).
  // e.g. "FOUNDER, ATELIER NORD" or "QUARTERLY REPORT, JAN 2026".
  secondary?: string;
  // Accent color for the left bar.
  accentColor?: string;
  // Text color.
  color?: string;
  // Background panel color. Default rgba(0,0,0,0.65).
  background?: string;
  // Frame to start the slide-in. Default 0.
  startFrame?: number;
  // Frames to slide in. Default 16.
  durationFrames?: number;
  // Distance from bottom in px. Default 120.
  bottomInset?: number;
  // Distance from left in px. Default 64.
  leftInset?: number;
};

export const LowerThird: React.FC<Props> = ({
  primary,
  secondary,
  accentColor = "#00D4A4",
  color = "#FFFFFF",
  background = "rgba(0, 0, 0, 0.65)",
  startFrame = 0,
  durationFrames = 16,
  bottomInset = 120,
  leftInset = 64,
}) => {
  const frame = useCurrentFrame();
  const elapsed = frame - startFrame;

  const t = interpolate(elapsed, [0, durationFrames], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const slideY = (1 - t) * 32;
  const accentBarHeight = interpolate(elapsed, [0, durationFrames * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: bottomInset,
        left: leftInset,
        display: "flex",
        alignItems: "stretch",
        gap: 18,
        opacity: t,
        transform: `translateY(${slideY}px)`,
      }}
    >
      <div
        style={{
          width: 4,
          background: accentColor,
          alignSelf: "stretch",
          transform: `scaleY(${accentBarHeight})`,
          transformOrigin: "top",
        }}
      />
      <div
        style={{
          padding: "14px 22px",
          background,
          color,
          backdropFilter: "blur(6px)",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div
          style={{
            fontFamily: '"SF Pro Display", "Inter Display", sans-serif',
            fontWeight: 700,
            fontSize: 32,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          {primary}
        </div>
        {secondary ? (
          <div
            style={{
              fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
              fontWeight: 500,
              fontSize: 14,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              opacity: 0.78,
            }}
          >
            {secondary}
          </div>
        ) : null}
      </div>
    </div>
  );
};
