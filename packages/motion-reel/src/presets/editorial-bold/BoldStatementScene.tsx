// BoldStatementScene — the workhorse of editorial-bold. Mixed-weight
// composition: a small lead phrase at the top in light weight, then
// a HUGE heavy display word/phrase, with one word colored in accent.
// Optional small trailing phrase at the bottom in light weight.
//
// Reference: Empire Labs reels' "Most billion-dollar **companies**"
// frame, where one purple word is the punchline and the rest of the
// statement supports it.
//
// Composition variants by index hash:
//   - top:   lead = small light, hero = big heavy with accent word, trail = small light
//   - left:  lead and hero left-aligned (variation in ~30% of scenes)
//
// Animation:
//   - Lead phrase fades + slides up (0..stagger)
//   - Hero phrase scales in word-by-word (stagger..stagger*3)
//   - Accent word color-shifts from ink to accent on its reveal frame

"use client";

import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { paceEasing, paceStaggerFrames } from "../../motion/pace";
import { fitText } from "../../motion/fitText";
import type { BrandTokens, VideoDesign } from "../../types";
import type { BoldStatementShape } from "../types";

export type { BoldStatementShape };

type Props = {
  tokens: BrandTokens;
  scene: BoldStatementShape;
  design: Required<VideoDesign>;
};

export const BoldStatementScene: React.FC<Props> = ({
  tokens,
  scene,
  design,
}) => {
  const frame = useCurrentFrame();
  const easing = paceEasing(design.pace);
  const stagger = paceStaggerFrames(design.pace);
  const accent = accentColor(design.accent, tokens);

  // editorial-bold ALWAYS uses white background regardless of style.
  // That's the load-bearing visual decision.
  const bg = "#FFFFFF";
  const ink = "#0F0F0F";
  const inkLight = "#5A5A5A";

  // Decide which word in `hero` is the emphasis. Default: last word.
  const heroWords = scene.hero.split(/(\s+)/).filter((s) => s.length > 0);
  const heroLetters = scene.hero.length;
  const emphasisLower = (scene.emphasis ?? lastWord(scene.hero)).toLowerCase();

  // Hero font size — fit the whole phrase across at most 3 lines.
  const heroFontSize = fitText({
    text: scene.hero,
    maxSize: 220,
    minSize: 88,
    advance: 0.52,
    maxLines: scene.hero.length > 30 ? 3 : 2,
  });

  // Lead and trail get the same fitText treatment but with smaller
  // budgets. They're support text.
  const supportFontSize = fitText({
    text: scene.lead ?? scene.trail ?? "",
    maxSize: 44,
    minSize: 26,
    advance: 0.5,
    maxLines: 1,
  });

  const leadOpacity = interpolate(frame, [4, 4 + stagger], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const leadY = interpolate(frame, [4, 4 + stagger], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const heroStart = scene.lead ? 4 + stagger : 4;
  const heroEnd = heroStart + stagger * 2.5;

  const trailStart = heroEnd + stagger;
  const trailOpacity = interpolate(
    frame,
    [trailStart, trailStart + stagger],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        background: bg,
        color: ink,
        fontFamily:
          '"SF Pro Display", "Inter", -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "120px 80px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: scene.lead || scene.trail ? 48 : 0,
        }}
      >
        {scene.lead ? (
          <div
            style={{
              fontSize: supportFontSize,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              color: inkLight,
              opacity: leadOpacity,
              transform: `translateY(${leadY}px)`,
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            {scene.lead}
          </div>
        ) : null}

        <div
          style={{
            fontSize: heroFontSize,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 0.95,
            color: ink,
            textAlign: "center",
            wordBreak: "break-word",
            overflowWrap: "anywhere",
            maxWidth: "100%",
          }}
        >
          {heroWords.map((token, i) => {
            // Whitespace tokens render as-is; word tokens animate +
            // get accent color if they match emphasisLower.
            if (/^\s+$/.test(token)) return <span key={i}>{token}</span>;

            // Per-word stagger. Words appear sequentially at small
            // offsets so the eye reads left-to-right.
            const wordIndex = heroWords.slice(0, i).filter((w) => !/^\s+$/.test(w)).length;
            const start = heroStart + wordIndex * (stagger * 0.6);
            const opacity = interpolate(
              frame,
              [start, start + stagger * 1.4],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );
            const ty = interpolate(
              frame,
              [start, start + stagger * 1.4],
              [16, 0],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing,
              },
            );

            const cleaned = token.replace(/[^\p{L}\p{N}']/gu, "").toLowerCase();
            const isEmphasis = cleaned.length > 0 && cleaned === emphasisLower;
            const wordColor = isEmphasis ? accent : ink;

            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  color: wordColor,
                  opacity,
                  transform: `translateY(${ty}px)`,
                }}
              >
                {token}
              </span>
            );
          })}
        </div>

        {scene.trail ? (
          <div
            style={{
              fontSize: supportFontSize,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              color: inkLight,
              opacity: trailOpacity,
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            {scene.trail}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

function lastWord(s: string): string {
  const words = s
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}']/gu, ""))
    .filter((w) => w.length > 0);
  return words[words.length - 1] ?? s;
}

function accentColor(accent: VideoDesign["accent"], tokens: BrandTokens): string {
  switch (accent) {
    case "alive":
      return tokens.aliveDark || tokens.alive || "#3a9d5c";
    case "attn":
      return tokens.attnText || "#D9A21C";
    case "urgent":
      return "#C84A3E";
    case "ink":
    default:
      return "#0F0F0F";
  }
}
