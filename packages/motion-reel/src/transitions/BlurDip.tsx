// BlurDip — applies a brief gaussian blur over the frame at the start
// of a scene, easing back to sharp over ~12 frames. Reads as a soft
// "focus pull" between cuts — feels like the camera refocusing.
// Pairs well with quote and contrast scenes where the cut wants to
// breathe.
//
// Implementation: CSS `backdrop-filter: blur()` on a transparent
// AbsoluteFill. Browsers/Chromium-on-Lambda handle this cheaply.

import { AbsoluteFill, interpolate, Easing, useCurrentFrame } from "remotion";

type Props = {
  // Maximum blur radius in px. Default 24 — visible but not abstract.
  peakBlur?: number;
  durationFrames?: number;
};

export const BlurDip: React.FC<Props> = ({
  peakBlur = 24,
  durationFrames = 12,
}) => {
  const frame = useCurrentFrame();
  if (frame > durationFrames) return null;

  const blur = interpolate(frame, [0, durationFrames], [peakBlur, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill
      style={{
        zIndex: 55,
        backdropFilter: `blur(${blur}px)`,
        WebkitBackdropFilter: `blur(${blur}px)`,
        pointerEvents: "none",
      }}
    />
  );
};
