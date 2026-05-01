// Word-by-word fade-up. Each word fades up + slides up by a small
// amount in sequence. Premium feel — much classier than a typewriter
// cursor for short-form video. Closer to what professional motion
// designers use for one-liner reels.
//
// Driven by Remotion's useCurrentFrame so every frame is deterministic.

import { useCurrentFrame, interpolate, Easing } from "remotion";

type Props = {
  // The text to reveal. Split on whitespace; punctuation stays with
  // its preceding word ("hello," is one token, not "hello" + ",").
  children: string;
  // Frame at which the first word starts revealing. Defaults to 0.
  startFrame?: number;
  // Frames between consecutive word reveals. 4 frames at 30fps =
  // ~133ms — fast enough to feel snappy, slow enough that the eye
  // catches each word individually.
  staggerFrames?: number;
  // Frames each individual word takes to fully fade + travel up.
  wordDurationFrames?: number;
  // Vertical travel in px — how far each word starts below its rest
  // position before sliding up. Small for quotes (12-16), bigger for
  // single-word headlines (20-30).
  travel?: number;
  style?: React.CSSProperties;
};

export function WordReveal({
  children,
  startFrame = 0,
  staggerFrames = 4,
  wordDurationFrames = 16,
  travel = 14,
  style,
}: Props) {
  const frame = useCurrentFrame();
  const words = children.split(/\s+/).filter(Boolean);

  return (
    <span style={style}>
      {words.map((word, i) => {
        const wordStart = startFrame + i * staggerFrames;
        const local = frame - wordStart;
        const opacity = interpolate(
          local,
          [0, wordDurationFrames],
          [0, 1],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          },
        );
        const ty = interpolate(
          local,
          [0, wordDurationFrames],
          [travel, 0],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          },
        );
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity,
              transform: `translateY(${ty}px)`,
              willChange: "opacity, transform",
            }}
          >
            {word}
            {i < words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </span>
  );
}
