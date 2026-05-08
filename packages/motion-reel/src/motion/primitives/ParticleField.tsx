// ParticleField — drifting particles overlaid on the scene. Three
// flavors: dust (small slow specks), embers (warm-colored drifting
// up), geometric (small squares/triangles slow-rotating). Particle
// positions seeded by `seed` so the same draft renders the same
// particle distribution every time.
//
// Cheap to render — 16-32 absolutely-positioned divs with
// CSS-driven motion. No canvas, no WebGL.

"use client";

import { interpolate, useCurrentFrame } from "remotion";
import { useMemo } from "react";

type Flavor = "dust" | "embers" | "geometric";

type Props = {
  flavor?: Flavor;
  // Color override. Defaults: dust=#FFFFFF20, embers=#FFB45460,
  // geometric=#0F0F0F30. Pass a brand accent for branded particles.
  color?: string;
  // Particle count. Default 24. Keep ≤40 for render perf.
  count?: number;
  // Determinism seed — same number = same particle layout. Pass
  // brand-signature seed + scene index so each scene's particles
  // are stable on re-render but differ between scenes.
  seed?: number;
  // Opacity multiplier. Default 1. Pass 0.5 to make particles less
  // dominant when a hero photo is behind.
  opacity?: number;
};

// Mulberry32 — tiny seedable PRNG. Same seed → same sequence.
function rng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ParticleField: React.FC<Props> = ({
  flavor = "dust",
  color,
  count = 24,
  seed = 1,
  opacity = 1,
}) => {
  const frame = useCurrentFrame();

  const particles = useMemo(() => {
    const rand = rng(seed);
    return Array.from({ length: count }, () => ({
      x: rand() * 100, // %
      y: rand() * 100, // %
      size:
        flavor === "geometric"
          ? 4 + rand() * 8
          : flavor === "embers"
            ? 2 + rand() * 4
            : 1.5 + rand() * 3,
      speed: 0.5 + rand() * 1.5,
      drift: (rand() - 0.5) * 30, // horizontal drift amplitude px
      rotation: rand() * 360,
      opacityBase: 0.3 + rand() * 0.6,
      phase: rand() * 100,
    }));
  }, [seed, count, flavor]);

  const resolvedColor =
    color ??
    (flavor === "dust"
      ? "rgba(255, 255, 255, 0.4)"
      : flavor === "embers"
        ? "rgba(255, 180, 84, 0.6)"
        : "rgba(15, 15, 15, 0.3)");

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        opacity,
      }}
    >
      {particles.map((p, i) => {
        // Each particle rises (embers) or drifts (dust/geometric)
        // based on flavor. Phase-offset so they don't all move in
        // lockstep.
        const t = (frame / 30 + p.phase) * p.speed;
        const yOffset =
          flavor === "embers" ? -t * 24 : Math.sin(t) * 8;
        const xOffset = Math.sin(t * 0.7) * p.drift;
        const opacityPulse =
          flavor === "embers"
            ? interpolate(
                ((t * 10) % 30) / 30,
                [0, 0.5, 1],
                [0, p.opacityBase, 0],
              )
            : p.opacityBase * (0.7 + 0.3 * Math.sin(t));

        const style: React.CSSProperties = {
          position: "absolute",
          left: `${p.x}%`,
          top: `${p.y}%`,
          width: p.size,
          height: p.size,
          background: flavor === "geometric" ? "transparent" : resolvedColor,
          border: flavor === "geometric" ? `1px solid ${resolvedColor}` : "none",
          borderRadius: flavor === "geometric" ? 0 : "50%",
          opacity: opacityPulse,
          transform: `translate(${xOffset}px, ${yOffset}px) rotate(${
            p.rotation + (flavor === "geometric" ? t * 20 : 0)
          }deg)`,
          willChange: "transform, opacity",
        };
        return <div key={i} style={style} />;
      })}
    </div>
  );
};
