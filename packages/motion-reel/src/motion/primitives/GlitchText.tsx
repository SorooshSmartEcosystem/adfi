// GlitchText — RGB-shift glitch effect on text. Three colored copies
// of the same text offset slightly with cyan/magenta/yellow channels,
// producing a chromatic aberration look. Optional periodic "stutter"
// frames where the offset jumps. Used for energetic / urgent /
// dashboard-tech beats.

"use client";

import { useCurrentFrame } from "remotion";

type Props = {
  text: string;
  // Base color of the main text. Default ink.
  color?: string;
  // Channel colors for the offset copies. Defaults: cyan + magenta.
  channelA?: string;
  channelB?: string;
  // Offset in px. Default 4.
  offset?: number;
  // Stutter — every N frames the offset jumps to a different value.
  // 0 = no stutter (smooth offset). Default 12.
  stutterFrames?: number;
  // Inline style.
  style?: React.CSSProperties;
};

export const GlitchText: React.FC<Props> = ({
  text,
  color = "currentColor",
  channelA = "#00FFFF",
  channelB = "#FF00FF",
  offset = 4,
  stutterFrames = 12,
  style,
}) => {
  const frame = useCurrentFrame();

  // Stutter — when stutterFrames > 0, the offset changes every N
  // frames instead of being constant. Simulates digital glitch.
  const stutter = stutterFrames > 0
    ? Math.floor(frame / stutterFrames)
    : 0;
  const ax = offset * (1 + (stutter % 3) * 0.4) * (stutter % 2 === 0 ? 1 : -1);
  const ay = offset * 0.5 * ((stutter + 1) % 2 === 0 ? 1 : -1);
  const bx = -ax;
  const by = -ay * 0.7;

  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        color,
        ...style,
      }}
    >
      <span
        style={{
          position: "absolute",
          left: ax,
          top: ay,
          color: channelA,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
        aria-hidden
      >
        {text}
      </span>
      <span
        style={{
          position: "absolute",
          left: bx,
          top: by,
          color: channelB,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
        aria-hidden
      >
        {text}
      </span>
      <span style={{ position: "relative" }}>{text}</span>
    </span>
  );
};
