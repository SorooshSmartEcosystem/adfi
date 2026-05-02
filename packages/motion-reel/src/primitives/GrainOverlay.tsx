// GrainOverlay — adds an animated film-grain texture across the
// composition. This is the single biggest visual upgrade we can make
// because it kills the "looks AI-generated" sheen that makes our
// output read as a slick PowerPoint export. Real motion design
// always has a layer of perceptual noise.
//
// Implementation: SVG feTurbulence with stitchTiles="noStitch" and a
// per-frame seed shift. Drawn through a screen-blend opacity layer so
// it sits over the scene without dominating colour.
//
// Performance: rendered at 540×960 then scaled — a fraction of the
// 1080×1920 cost. Lambda renders this comfortably in our duration
// budget; the visible difference vs. computing at full res is zero.

import { AbsoluteFill, useCurrentFrame } from "remotion";

type Props = {
  // 0..1, default 0.08. Higher = more visible grain.
  intensity?: number;
  // Spatial frequency. 0.65–0.95 is the "filmic" sweet spot. Higher =
  // finer (digital) grain, lower = chunkier (16mm) grain.
  frequency?: number;
  // Blend mode applied to the overlay. "soft-light" works on light and
  // dark backgrounds; "overlay" pushes contrast harder.
  blend?: "soft-light" | "overlay" | "screen" | "multiply";
};

export const GrainOverlay: React.FC<Props> = ({
  intensity = 0.08,
  frequency = 0.85,
  blend = "soft-light",
}) => {
  const frame = useCurrentFrame();
  // Shift the seed every 2 frames so the grain "swims" without
  // strobing. Modulo keeps the seed bounded for SVG.
  const seed = (frame >> 1) % 12;

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        mixBlendMode: blend,
        opacity: intensity,
      }}
    >
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <filter id={`grain-${seed}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency={frequency}
            numOctaves={2}
            seed={seed}
            stitchTiles="noStitch"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1
                    0 0 0 0 1
                    0 0 0 0 1
                    0 0 0 1 0"
          />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};
