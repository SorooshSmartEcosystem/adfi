// KineticLetters — per-letter animation primitives. Each letter of
// a string is wrapped in a span and animated independently. Six
// styles, each with a distinct visual feel. Same string can reveal
// dramatically differently depending on which style is picked.
//
// Styles:
//   - cascade        — letters fall in from above sequentially
//   - rise           — letters rise from below sequentially
//   - scale-in       — letters scale 0 → 1 from a small punch
//   - scramble       — letters cycle through random chars before
//                      landing on the right one (terminal-style)
//   - rotate-in      — letters spin in from a slight rotation
//   - directional    — letters slide in from random sides

"use client";

import { Easing, interpolate, useCurrentFrame } from "remotion";
import { useMemo } from "react";

type Style = "cascade" | "rise" | "scale-in" | "scramble" | "rotate-in" | "directional";

type Props = {
  text: string;
  style?: Style;
  // Frame the animation starts at. Default 0.
  startFrame?: number;
  // Frames between consecutive letters. Default 2.
  stagger?: number;
  // Frames each letter takes to settle. Default 12.
  letterDuration?: number;
  // Determinism seed for `directional` and `scramble`. Same seed →
  // same per-letter directions / scrambled chars.
  seed?: number;
  // Inline style overrides applied to the wrapper span.
  containerStyle?: React.CSSProperties;
  // Inline style applied to each letter span.
  letterStyle?: React.CSSProperties;
};

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";

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

export const KineticLetters: React.FC<Props> = ({
  text,
  style = "cascade",
  startFrame = 0,
  stagger = 2,
  letterDuration = 12,
  seed = 1,
  containerStyle,
  letterStyle,
}) => {
  const frame = useCurrentFrame();

  const directions = useMemo(() => {
    const rand = rng(seed);
    return Array.from({ length: text.length }, () => {
      const r = rand();
      if (r < 0.25) return { x: -120, y: 0 };
      if (r < 0.5) return { x: 120, y: 0 };
      if (r < 0.75) return { x: 0, y: -120 };
      return { x: 0, y: 120 };
    });
  }, [text.length, seed]);

  const scrambledFrames = useMemo(() => {
    const rand = rng(seed);
    // Each letter pulls 6 scramble chars; renderer picks one based
    // on frame within its window so the scramble looks animated.
    return Array.from({ length: text.length }, () =>
      Array.from(
        { length: 6 },
        () => SCRAMBLE_CHARS[Math.floor(rand() * SCRAMBLE_CHARS.length)],
      ),
    );
  }, [text.length, seed]);

  const letters = [...text];

  return (
    <span
      style={{
        display: "inline-flex",
        flexWrap: "wrap",
        ...containerStyle,
      }}
    >
      {letters.map((ch, i) => {
        if (ch === " ") {
          return (
            <span key={i} style={{ width: "0.3em", display: "inline-block" }} />
          );
        }

        const letterStart = startFrame + i * stagger;
        const letterEnd = letterStart + letterDuration;
        const t = interpolate(frame, [letterStart, letterEnd], [0, 1], {
          easing: Easing.out(Easing.cubic),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const opacity = t;

        let transform = "none";
        let displayChar = ch;

        switch (style) {
          case "cascade":
            transform = `translateY(${(1 - t) * -32}px)`;
            break;
          case "rise":
            transform = `translateY(${(1 - t) * 32}px)`;
            break;
          case "scale-in":
            transform = `scale(${0.4 + t * 0.6})`;
            break;
          case "rotate-in":
            transform = `rotate(${(1 - t) * -18}deg) translateY(${
              (1 - t) * 12
            }px)`;
            break;
          case "directional": {
            const dir = directions[i] ?? { x: 0, y: 0 };
            transform = `translate(${(1 - t) * dir.x}px, ${(1 - t) * dir.y}px)`;
            break;
          }
          case "scramble": {
            // Scramble between letterStart and letterEnd-2; show real
            // char in the final 2 frames.
            if (frame < letterEnd - 2 && frame >= letterStart) {
              const scrambleSet = scrambledFrames[i] ?? [];
              const idx = Math.floor(((frame - letterStart) / 2) % scrambleSet.length);
              displayChar = scrambleSet[idx] ?? ch;
            } else if (frame < letterStart) {
              displayChar = ""; // not yet visible
            }
            break;
          }
          default:
            break;
        }

        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity,
              transform,
              willChange: "transform, opacity",
              ...letterStyle,
            }}
          >
            {displayChar}
          </span>
        );
      })}
    </span>
  );
};
