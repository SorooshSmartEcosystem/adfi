// ColorFlash — a 2-3 frame full-frame burst of accent color at the
// start of a scene. Used as a percussive "hit" between scenes — the
// visual equivalent of a snare drum that punctuates a beat change.
// Especially effective on the punchline scene where a hard cut +
// flash sells the reveal.
//
// Visual contract:
//   - Renders a full-frame block in `color` at full opacity for
//     `holdFrames`, then fades out over `fadeFrames`.
//   - Caller wraps at AbsoluteFill level; component returns null after
//     the flash completes.

import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

type Props = {
  color: string;
  // Frames the flash stays at full opacity. Default 2 ≈ 67ms at 30fps.
  holdFrames?: number;
  // Frames the flash fades over. Default 4 ≈ 130ms at 30fps.
  fadeFrames?: number;
  // Maximum opacity the flash reaches. 1.0 fully whites/colors out the
  // frame. 0.6-0.8 is more cinematic; tunable per scene.
  peakOpacity?: number;
};

export const ColorFlash: React.FC<Props> = ({
  color,
  holdFrames = 2,
  fadeFrames = 4,
  peakOpacity = 0.85,
}) => {
  const frame = useCurrentFrame();
  const total = holdFrames + fadeFrames;
  if (frame > total) return null;

  const opacity = interpolate(
    frame,
    [0, holdFrames, total],
    [peakOpacity, peakOpacity, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  return (
    <AbsoluteFill
      style={{
        background: color,
        opacity,
        zIndex: 60,
        pointerEvents: "none",
      }}
    />
  );
};
