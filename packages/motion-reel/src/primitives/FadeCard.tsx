// FadeCard — a card that slides up while fading in. The default
// "container" primitive for cards that hold text or stats inside a
// composition. Wraps any children, no opinion about content.

import { useCurrentFrame, interpolate, Easing } from "remotion";

type Props = {
  children: React.ReactNode;
  // Frame at which the card begins to appear.
  startFrame?: number;
  // How long the entrance takes. Defaults to 18 frames (~0.6s @ 30fps).
  durationFrames?: number;
  // Pixels of upward travel during the entrance. Default 28.
  travel?: number;
  // Optional fade-out tail. When set, the card eases back to 0 opacity
  // over `exitDurationFrames` ending at `exitFrame`. Useful for
  // staggered card sequences where each card hands off to the next.
  exitFrame?: number;
  exitDurationFrames?: number;
  style?: React.CSSProperties;
};

export function FadeCard({
  children,
  startFrame = 0,
  durationFrames = 18,
  travel = 28,
  exitFrame,
  exitDurationFrames = 12,
  style,
}: Props) {
  const frame = useCurrentFrame();

  // Entrance: opacity + translateY both ease together.
  const entrance = interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
  );

  // Exit: ramps opacity back down. Translate stays at 0 — exits
  // shouldn't drift, just fade.
  const exit = exitFrame !== undefined
    ? interpolate(
        frame,
        [exitFrame - exitDurationFrames, exitFrame],
        [1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) },
      )
    : 1;

  const opacity = entrance * exit;
  const translateY = (1 - entrance) * travel;

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
