// ProceduralShape — animated SVG geometry overlaid on a scene.
// Six shape types, each with its own animation: lines drawing in,
// circles pulsing/expanding, polygons rotating, dashed boxes. Used
// as decorative accents that imply structure / engineering /
// craftsmanship without being literal icons.
//
// Stroke is brand-accent-aware. Fill is always transparent (line
// art aesthetic).

"use client";

import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

type ShapeKind =
  | "line-draw"        // single horizontal line draws across
  | "circle-pulse"     // ring expands and fades
  | "polygon-rotate"   // hexagon/triangle slow-rotates
  | "dashed-box"       // dashed rectangle border draws around
  | "cross-marks"      // 4 corner cross-marks draw in (engineering)
  | "diagonal-grid";   // diagonal grid lines draw in

type Props = {
  kind?: ShapeKind;
  color?: string;
  // Stroke width. Default 2.
  strokeWidth?: number;
  // Position of the shape's center as % of frame (0-100). Some
  // kinds ignore this (line-draw, dashed-box, diagonal-grid use
  // full frame).
  cx?: number;
  cy?: number;
  // Size in px (radius for circle, edge for polygon). Default 200.
  size?: number;
  // Opacity. Default 0.5.
  opacity?: number;
};

export const ProceduralShape: React.FC<Props> = ({
  kind = "line-draw",
  color = "currentColor",
  strokeWidth = 2,
  cx = 50,
  cy = 50,
  size = 200,
  opacity = 0.5,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = interpolate(frame, [0, Math.min(40, durationInFrames)], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: "clamp",
  });

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    opacity,
  };

  switch (kind) {
    case "line-draw": {
      // Horizontal line drawing across at cy%.
      return (
        <svg style={baseStyle} viewBox="0 0 1080 1920" preserveAspectRatio="none">
          <line
            x1={0}
            y1={(cy / 100) * 1920}
            x2={t * 1080}
            y2={(cy / 100) * 1920}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        </svg>
      );
    }
    case "circle-pulse": {
      const r = t * size;
      const fade = interpolate(t, [0, 0.5, 1], [0, 1, 0]);
      return (
        <svg style={baseStyle} viewBox="0 0 1080 1920" preserveAspectRatio="none">
          <circle
            cx={(cx / 100) * 1080}
            cy={(cy / 100) * 1920}
            r={r}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            opacity={fade}
          />
        </svg>
      );
    }
    case "polygon-rotate": {
      // Hexagon centered at (cx, cy), rotating slowly.
      const angle = (frame / 30) * 12; // 12°/sec
      const ax = (cx / 100) * 1080;
      const ay = (cy / 100) * 1920;
      const points = Array.from({ length: 6 }, (_, i) => {
        const a = ((i * 60 + angle) * Math.PI) / 180;
        return `${ax + Math.cos(a) * size},${ay + Math.sin(a) * size}`;
      }).join(" ");
      return (
        <svg style={baseStyle} viewBox="0 0 1080 1920" preserveAspectRatio="none">
          <polygon
            points={points}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            opacity={t}
          />
        </svg>
      );
    }
    case "dashed-box": {
      // Dashed rectangle border drawing around the frame edge.
      const inset = 60;
      const perim = 2 * (1080 - inset * 2) + 2 * (1920 - inset * 2);
      const drawn = t * perim;
      return (
        <svg style={baseStyle} viewBox="0 0 1080 1920" preserveAspectRatio="none">
          <rect
            x={inset}
            y={inset}
            width={1080 - inset * 2}
            height={1920 - inset * 2}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${drawn} ${perim}`}
            strokeDashoffset={0}
          />
        </svg>
      );
    }
    case "cross-marks": {
      // Four engineering-style cross-marks at the corners.
      const inset = 80;
      const armLen = 24 * t;
      return (
        <svg style={baseStyle} viewBox="0 0 1080 1920" preserveAspectRatio="none">
          {[
            [inset, inset],
            [1080 - inset, inset],
            [inset, 1920 - inset],
            [1080 - inset, 1920 - inset],
          ].map(([x, y], i) => (
            <g key={i} stroke={color} strokeWidth={strokeWidth}>
              <line x1={x! - armLen} y1={y!} x2={x! + armLen} y2={y!} />
              <line x1={x!} y1={y! - armLen} x2={x!} y2={y! + armLen} />
            </g>
          ))}
        </svg>
      );
    }
    case "diagonal-grid": {
      // Six diagonal lines drawing in across the frame.
      return (
        <svg style={baseStyle} viewBox="0 0 1080 1920" preserveAspectRatio="none">
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const offset = (i * 1920) / 6;
            const drawT = Math.max(0, Math.min(1, (t - i * 0.08) * 2));
            return (
              <line
                key={i}
                x1={0}
                y1={offset}
                x2={drawT * 1080}
                y2={offset - drawT * 600}
                stroke={color}
                strokeWidth={strokeWidth}
                opacity={drawT * 0.6}
              />
            );
          })}
        </svg>
      );
    }
    default:
      return null;
  }
};
