// MatchCutShape — a recurring brand shape that exits the previous
// scene and enters the next at the same screen position, creating a
// visual through-line. The single biggest "we know what we're doing"
// motion-design tell.
//
// We can't synchronize across two Sequence boundaries cleanly without
// rewriting the composition, so instead this component renders a
// SHAPE that BOTH:
//   - Slides on-screen to a target position during the first ~10 frames.
//   - Pulses subtly while held (reads as "still alive between cuts").
//
// Caller renders this at the start of each scene with the same
// `position` for adjacent scenes — when scene N's matched shape exits
// (is removed at scene boundary) and scene N+1's matched shape enters
// at the same position, the eye reads them as continuous.

import { AbsoluteFill, interpolate, Easing, useCurrentFrame } from "remotion";

export type ShapeKind = "circle" | "square" | "underline" | "dot";

type Props = {
  kind: ShapeKind;
  color: string;
  // Center of the shape, in 0..1 coordinates relative to frame size.
  // Adjacent scenes pass the same value to fake the match cut.
  x: number;
  y: number;
  // Shape size in px (height of underline, diameter of circle, etc.).
  size?: number;
  introFrames?: number;
};

export const MatchCutShape: React.FC<Props> = ({
  kind,
  color,
  x,
  y,
  size = 48,
  introFrames = 10,
}) => {
  const frame = useCurrentFrame();
  const intro = interpolate(frame, [0, introFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  // Subtle held pulse — 4% scale wobble synced to a slow sine.
  const pulse = 1 + 0.04 * Math.sin((frame / 20) * Math.PI);

  const left = `calc(${x * 100}% - ${size / 2}px)`;
  const top = `calc(${y * 100}% - ${size / 2}px)`;

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left,
    top,
    width: size,
    height: size,
    background: color,
    transform: `scale(${intro * pulse})`,
    transformOrigin: "center center",
    pointerEvents: "none",
    zIndex: 40,
  };

  return (
    <AbsoluteFill>
      {kind === "circle" && (
        <div style={{ ...baseStyle, borderRadius: "50%" }} />
      )}
      {kind === "square" && <div style={baseStyle} />}
      {kind === "dot" && (
        <div
          style={{
            ...baseStyle,
            width: 12,
            height: 12,
            borderRadius: "50%",
            top: `calc(${y * 100}% - 6px)`,
            left: `calc(${x * 100}% - 6px)`,
          }}
        />
      )}
      {kind === "underline" && (
        <div
          style={{
            ...baseStyle,
            height: 6,
            width: size,
            top: `calc(${y * 100}% - 3px)`,
            borderRadius: 3,
          }}
        />
      )}
    </AbsoluteFill>
  );
};
