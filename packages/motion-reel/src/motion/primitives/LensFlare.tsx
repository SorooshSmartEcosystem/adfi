// LensFlare — animated cinematic lens flare. A bright soft circle
// pulses in/out with optional radial streaks. Position can be any
// corner / edge or centered. Looks expensive even though it's three
// CSS divs with radial-gradient + blur.
//
// Best used SPARINGLY — once per reel max (on a key beat / opening
// scene / closer). Overuse looks gaudy.

"use client";

import { Easing, interpolate, useCurrentFrame } from "remotion";

type Position = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top" | "bottom" | "center";

type Props = {
  // Hex / rgba color. Default warm light.
  color?: string;
  // Where the flare sits. Default "top-right".
  position?: Position;
  // Frame the flare peaks at. Default mid-scene.
  peakFrame?: number;
  // Frames to ramp up. Default 18.
  rampInFrames?: number;
  // Frames to fade out. Default 22.
  rampOutFrames?: number;
  // Peak intensity (opacity). Default 0.55.
  intensity?: number;
  // Show radial streaks (anamorphic lens style). Default true.
  streaks?: boolean;
  // Total scene frames — used to default peakFrame to mid-scene.
  totalFrames?: number;
};

const POSITION_COORDS: Record<Position, { x: string; y: string }> = {
  "top-left": { x: "12%", y: "18%" },
  "top-right": { x: "82%", y: "18%" },
  "bottom-left": { x: "12%", y: "78%" },
  "bottom-right": { x: "82%", y: "78%" },
  top: { x: "50%", y: "12%" },
  bottom: { x: "50%", y: "85%" },
  center: { x: "50%", y: "50%" },
};

export const LensFlare: React.FC<Props> = ({
  color = "rgba(255, 220, 160, 1)",
  position = "top-right",
  peakFrame,
  rampInFrames = 18,
  rampOutFrames = 22,
  intensity = 0.55,
  streaks = true,
  totalFrames = 90,
}) => {
  const frame = useCurrentFrame();
  const peak = peakFrame ?? Math.round(totalFrames * 0.5);

  const inPhase = interpolate(
    frame,
    [peak - rampInFrames, peak],
    [0, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const outPhase = interpolate(
    frame,
    [peak, peak + rampOutFrames],
    [1, 0],
    {
      easing: Easing.in(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const t = Math.min(inPhase, outPhase);
  const opacity = t * intensity;

  const { x, y } = POSITION_COORDS[position];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity,
        mixBlendMode: "screen",
      }}
    >
      {/* Bright core */}
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: 360,
          height: 360,
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color} 0%, transparent 60%)`,
          filter: "blur(8px)",
        }}
      />
      {/* Soft halo */}
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: 720,
          height: 720,
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          opacity: 0.5,
          filter: "blur(40px)",
        }}
      />
      {/* Anamorphic horizontal streak */}
      {streaks ? (
        <div
          style={{
            position: "absolute",
            left: x,
            top: y,
            width: "120%",
            height: 4,
            transform: "translate(-50%, -50%)",
            background: `linear-gradient(90deg, transparent, ${color} 50%, transparent)`,
            opacity: 0.6,
            filter: "blur(2px)",
          }}
        />
      ) : null}
    </div>
  );
};
