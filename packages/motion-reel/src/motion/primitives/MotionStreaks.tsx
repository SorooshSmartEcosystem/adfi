// MotionStreaks — animated speed-line / motion-streak overlay. Used
// for energetic beats, transitions, "this is fast" moments. Streaks
// fly across the frame in a chosen direction at varied speeds with
// motion-blur-feel via gradient fade.
//
// Three flavors:
//   - speed-lines  — thin diagonal streaks (anime / sports vibe)
//   - drift-lines  — slow horizontal streaks (cinematic depth)
//   - rain         — fast vertical streaks (visual energy / urgency)

"use client";

import { useCurrentFrame } from "remotion";
import { useMemo } from "react";

type Flavor = "speed-lines" | "drift-lines" | "rain";

type Props = {
  flavor?: Flavor;
  color?: string;
  count?: number;
  seed?: number;
  opacity?: number;
};

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

export const MotionStreaks: React.FC<Props> = ({
  flavor = "speed-lines",
  color = "rgba(255, 255, 255, 0.5)",
  count = 16,
  seed = 1,
  opacity = 0.7,
}) => {
  const frame = useCurrentFrame();

  const streaks = useMemo(() => {
    const rand = rng(seed);
    return Array.from({ length: count }, () => ({
      perp: rand() * 100, // perpendicular axis %
      speed: 0.5 + rand() * 1.5,
      length:
        flavor === "rain"
          ? 80 + rand() * 60
          : flavor === "drift-lines"
            ? 200 + rand() * 200
            : 120 + rand() * 100,
      thickness: flavor === "rain" ? 1.5 : flavor === "drift-lines" ? 1 : 2,
      phase: rand() * 100,
    }));
  }, [count, seed, flavor]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        opacity,
      }}
    >
      {streaks.map((s, i) => {
        const t = (frame / 30 + s.phase) * s.speed;
        // Loop through 0-100% on the parallel axis based on speed.
        const parallel = ((t * 60) % 140) - 20;

        let style: React.CSSProperties;
        if (flavor === "speed-lines") {
          style = {
            position: "absolute",
            top: `${s.perp}%`,
            left: `${parallel}%`,
            width: s.length,
            height: s.thickness,
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
            transform: "rotate(-12deg)",
          };
        } else if (flavor === "drift-lines") {
          style = {
            position: "absolute",
            top: `${s.perp}%`,
            left: `${parallel}%`,
            width: s.length,
            height: s.thickness,
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          };
        } else {
          // rain
          style = {
            position: "absolute",
            top: `${parallel}%`,
            left: `${s.perp}%`,
            width: s.thickness,
            height: s.length,
            background: `linear-gradient(180deg, transparent, ${color}, transparent)`,
          };
        }
        return <div key={i} style={style} />;
      })}
    </div>
  );
};
