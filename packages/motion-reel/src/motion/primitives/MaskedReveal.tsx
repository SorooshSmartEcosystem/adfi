// MaskedReveal — wraps children with an animated SVG mask that
// reveals them over the first ~22 frames. Five mask shapes, each
// driven by an animated SVG attribute (clip-path or mask-image).
// The shape variety + the easing variety means the same scene
// content can reveal in dramatically different ways depending on
// which mask is picked.
//
// Use as the OUTERMOST wrapper around any text block, image, or
// composite scene element. The mask only affects what's INSIDE the
// MaskedReveal, so a scene with a backdrop + a masked headline
// still shows the backdrop normally and reveals the headline through
// the mask.
//
// Shapes:
//   - circle    — circle expands from center (or a corner)
//   - diagonal  — diagonal line sweeps across (\ direction)
//   - line-h    — horizontal line wipes top→bottom or bottom→top
//   - line-v    — vertical line wipes left→right or right→left
//   - hexagon   — hexagon expands from a point (geometric, modern)

"use client";

import { Easing, interpolate, useCurrentFrame } from "remotion";

export type MaskShape = "circle" | "diagonal" | "line-h" | "line-v" | "hexagon";

type Props = {
  children: React.ReactNode;
  shape?: MaskShape;
  // Where the reveal originates. Used by `circle` and `hexagon`.
  // Ignored by line/diagonal masks.
  origin?: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
  // Direction for line wipes. Ignored by other shapes.
  direction?: "top" | "bottom" | "left" | "right";
  // Reveal duration in frames. Default 22 (~0.7s at 30fps).
  durationFrames?: number;
  // Frame the reveal starts. Default 0.
  startFrame?: number;
  // Inverts the mask — content REVEALS as it disappears (used for
  // exit animations on the next scene's transition).
  invert?: boolean;
};

const ORIGIN_COORDS: Record<NonNullable<Props["origin"]>, [string, string]> = {
  center: ["50%", "50%"],
  "top-left": ["0%", "0%"],
  "top-right": ["100%", "0%"],
  "bottom-left": ["0%", "100%"],
  "bottom-right": ["100%", "100%"],
};

export const MaskedReveal: React.FC<Props> = ({
  children,
  shape = "circle",
  origin = "center",
  direction = "bottom",
  durationFrames = 22,
  startFrame = 0,
  invert = false,
}) => {
  const frame = useCurrentFrame();
  const t = interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    invert ? [1, 0] : [0, 1],
    {
      easing: Easing.inOut(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  let clipPath: string;
  switch (shape) {
    case "circle": {
      const [cx, cy] = ORIGIN_COORDS[origin];
      // Radius scales with the diagonal of the frame so the circle
      // always fully covers regardless of aspect ratio.
      const radius = Math.round(t * 150);
      clipPath = `circle(${radius}% at ${cx} ${cy})`;
      break;
    }
    case "diagonal": {
      // Polygon wipe diagonally — top-left to bottom-right.
      // At t=0: invisible single point. At t=1: full frame.
      const offset = (1 - t) * 200;
      clipPath = `polygon(0% 0%, ${100 + offset}% 0%, ${-offset}% 100%, 0% 100%)`;
      break;
    }
    case "line-h": {
      const cover = t * 100;
      clipPath =
        direction === "top"
          ? `inset(${100 - cover}% 0% 0% 0%)`
          : `inset(0% 0% ${100 - cover}% 0%)`;
      break;
    }
    case "line-v": {
      const cover = t * 100;
      clipPath =
        direction === "right"
          ? `inset(0% ${100 - cover}% 0% 0%)`
          : `inset(0% 0% 0% ${100 - cover}%)`;
      break;
    }
    case "hexagon": {
      // Approximated hexagonal reveal — uses 6-point polygon.
      // Scales from origin outward. At t=0 collapsed, t=1 full.
      const [cx, cy] = ORIGIN_COORDS[origin];
      const r = t * 120;
      // Six points around the center, rotated 0/60/120/180/240/300.
      const pts = Array.from({ length: 6 }, (_, i) => {
        const angle = (i * 60 - 30) * (Math.PI / 180);
        const px = `calc(${cx} + ${Math.cos(angle) * r}%)`;
        const py = `calc(${cy} + ${Math.sin(angle) * r}%)`;
        return `${px} ${py}`;
      }).join(", ");
      clipPath = `polygon(${pts})`;
      break;
    }
    default:
      clipPath = "none";
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        clipPath,
        WebkitClipPath: clipPath,
      }}
    >
      {children}
    </div>
  );
};
