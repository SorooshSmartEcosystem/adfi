// WipeReveal — masks scene content behind a colored block that slides
// off in a chosen direction during the first ~10 frames of the scene.
// Single-scene transition (no need to coordinate with the previous
// scene), making it cheap to apply universally.
//
// Visual contract:
//   - Renders a full-frame block in `color` that translates off-screen
//     between frames 0..durationFrames.
//   - Direction is "left" / "right" / "up" / "down" — block slides
//     toward that side.
//   - Caller wraps this around their scene at the AbsoluteFill level;
//     it draws on top of everything until the wipe completes.

import { AbsoluteFill, interpolate, Easing, useCurrentFrame } from "remotion";

export type WipeDirection = "left" | "right" | "up" | "down";

type Props = {
  color: string;
  direction?: WipeDirection;
  durationFrames?: number;
};

export const WipeReveal: React.FC<Props> = ({
  color,
  direction = "left",
  durationFrames = 12,
}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, durationFrames], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  // Convert progress (0→100) into a translate-offscreen on the chosen
  // axis. At progress=0 the block fully covers; at progress=100 it's
  // entirely off-screen on the named side.
  let transform = "";
  switch (direction) {
    case "left":
      transform = `translateX(-${progress}%)`;
      break;
    case "right":
      transform = `translateX(${progress}%)`;
      break;
    case "up":
      transform = `translateY(-${progress}%)`;
      break;
    case "down":
      transform = `translateY(${progress}%)`;
      break;
  }

  // Stop rendering after the wipe completes — no point in keeping a
  // hidden absolute on the tree.
  if (frame > durationFrames) return null;

  return (
    <AbsoluteFill
      style={{
        background: color,
        transform,
        zIndex: 50,
        pointerEvents: "none",
      }}
    />
  );
};
