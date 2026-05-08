// CameraMove — composition-level pan + zoom + optional shake. Wraps
// children and applies a transform that moves THE WHOLE SCENE as if
// a camera is moving through it. Different from Ken-Burns on a
// single image; this moves all layers together so backgrounds,
// text, and decorations all share the camera motion.
//
// Five styles:
//   - dolly-in        — slow zoom in (1.0 → 1.06 over scene)
//   - dolly-out       — slow zoom out (1.06 → 1.0 over scene)
//   - pan-left        — slow horizontal slide (right side
//                       enters frame)
//   - pan-right       — opposite of pan-left
//   - handheld-shake  — subtle continuous shake to break "static"
//                       scenes (perlin-noise-driven)

"use client";

import { Easing, interpolate, useCurrentFrame } from "remotion";

type Style =
  | "dolly-in"
  | "dolly-out"
  | "pan-left"
  | "pan-right"
  | "handheld-shake";

type Props = {
  children: React.ReactNode;
  style?: Style;
  // Total scene duration in frames. Required so the camera move
  // completes in sync with the scene boundary.
  totalFrames: number;
  // Intensity multiplier (0-1). Default 1. Use lower for subtle
  // moves (0.5 for a barely-perceptible dolly), higher for dramatic
  // (1.5 for a strong push-in on a punchline).
  intensity?: number;
};

// Smooth low-frequency noise for handheld shake. Pseudo-perlin
// using two sin waves at different frequencies; doesn't loop
// noticeably within a 6s scene.
function shakeXY(frame: number): { x: number; y: number } {
  const x =
    Math.sin(frame * 0.13) * 0.6 +
    Math.sin(frame * 0.31) * 0.3 +
    Math.sin(frame * 0.07) * 0.4;
  const y =
    Math.cos(frame * 0.11) * 0.5 +
    Math.cos(frame * 0.27) * 0.3 +
    Math.cos(frame * 0.05) * 0.4;
  return { x, y };
}

export const CameraMove: React.FC<Props> = ({
  children,
  style = "dolly-in",
  totalFrames,
  intensity = 1,
}) => {
  const frame = useCurrentFrame();

  let transform = "none";
  let transformOrigin = "center center";

  // Tuned 2026-05-08 — original 1.06/40px/4px were imperceptible;
  // bumped to 0.18/120px/12px was too aggressive (text clipped at
  // edges during pans). Settled on 0.12/80px/8px — visible motion
  // without losing edge content.
  switch (style) {
    case "dolly-in": {
      const scale = interpolate(
        frame,
        [0, totalFrames],
        [1.0, 1.0 + 0.12 * intensity],
        {
          easing: Easing.inOut(Easing.ease),
          extrapolateRight: "clamp",
        },
      );
      transform = `scale(${scale})`;
      break;
    }
    case "dolly-out": {
      const scale = interpolate(
        frame,
        [0, totalFrames],
        [1.0 + 0.12 * intensity, 1.0],
        {
          easing: Easing.inOut(Easing.ease),
          extrapolateRight: "clamp",
        },
      );
      transform = `scale(${scale})`;
      break;
    }
    case "pan-left": {
      const tx = interpolate(
        frame,
        [0, totalFrames],
        [80 * intensity, -80 * intensity],
        {
          easing: Easing.inOut(Easing.ease),
          extrapolateRight: "clamp",
        },
      );
      transform = `translateX(${tx}px) scale(1.08)`;
      break;
    }
    case "pan-right": {
      const tx = interpolate(
        frame,
        [0, totalFrames],
        [-80 * intensity, 80 * intensity],
        {
          easing: Easing.inOut(Easing.ease),
          extrapolateRight: "clamp",
        },
      );
      transform = `translateX(${tx}px) scale(1.08)`;
      break;
    }
    case "handheld-shake": {
      const { x, y } = shakeXY(frame);
      transform = `translate(${x * 8 * intensity}px, ${y * 8 * intensity}px)`;
      break;
    }
    default:
      transform = "none";
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transform,
        transformOrigin,
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
};
