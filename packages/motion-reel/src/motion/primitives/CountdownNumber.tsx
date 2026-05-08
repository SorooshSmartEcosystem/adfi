// CountdownNumber — dramatic large-number reveal. Used for
// milestone scenes ("3 years", "100k users", "$2M") or countdown
// beats. Number scales from 0.6 → 1.0 with a punch easing while
// fading in, optional decorative ring/border around the number.

"use client";

import { Easing, interpolate, useCurrentFrame } from "remotion";

type Props = {
  // The number or value to display. e.g. "100K", "$2.4M", "3".
  value: string;
  // Optional small label above the number.
  label?: string;
  // Optional small label below the number.
  caption?: string;
  // Color of the number. Default currentColor.
  color?: string;
  // Accent color for label/caption. Default currentColor with low opacity.
  accentColor?: string;
  // Frame to start the punch animation. Default 0.
  startFrame?: number;
  // Show decorative ring around number. Default false.
  ring?: boolean;
  // Font size of the number. Default 280.
  numberSize?: number;
  // Inline style applied to the wrapper.
  containerStyle?: React.CSSProperties;
};

export const CountdownNumber: React.FC<Props> = ({
  value,
  label,
  caption,
  color = "currentColor",
  accentColor,
  startFrame = 0,
  ring = false,
  numberSize = 280,
  containerStyle,
}) => {
  const frame = useCurrentFrame();
  const t = frame - startFrame;

  // Punch scale: starts at 0.6, overshoots to 1.08, settles at 1.0.
  const scale = interpolate(t, [0, 12, 22], [0.6, 1.08, 1.0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(t, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const labelOpacity = interpolate(t, [10, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const captionOpacity = interpolate(t, [20, 32], [0, 0.8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Ring scales in opposite direction — starts large, settles to fit.
  const ringScale = interpolate(t, [0, 22], [1.4, 1.0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ringOpacity = interpolate(t, [4, 18], [0, 0.8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const accent = accentColor ?? color;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        ...containerStyle,
      }}
    >
      {label ? (
        <div
          style={{
            fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: accent,
            opacity: labelOpacity,
          }}
        >
          {label}
        </div>
      ) : null}

      <div style={{ position: "relative" }}>
        {ring ? (
          <div
            style={{
              position: "absolute",
              inset: -40,
              border: `3px solid ${accent}`,
              borderRadius: "50%",
              transform: `scale(${ringScale})`,
              opacity: ringOpacity,
            }}
          />
        ) : null}
        <div
          style={{
            fontFamily: '"SF Pro Display", "Inter Display", sans-serif',
            fontWeight: 800,
            fontSize: numberSize,
            lineHeight: 0.9,
            letterSpacing: "-0.05em",
            color,
            opacity,
            transform: `scale(${scale})`,
            transformOrigin: "center center",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </div>
      </div>

      {caption ? (
        <div
          style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: 22,
            fontWeight: 400,
            color: accent,
            opacity: captionOpacity,
            textAlign: "center",
            maxWidth: 480,
            lineHeight: 1.4,
          }}
        >
          {caption}
        </div>
      ) : null}
    </div>
  );
};
