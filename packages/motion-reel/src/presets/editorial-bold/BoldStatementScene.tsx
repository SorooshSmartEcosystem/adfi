// BoldStatementScene — the workhorse of editorial-bold. Mixed-weight
// composition: a small lead phrase, a HUGE heavy display statement
// with one accent-color emphasis word, optional small trailing phrase.
//
// Reference: Empire Labs reels' "Most billion-dollar **companies**"
// frame and similar editorial layouts.
//
// Three layout variants rotate by `layout` field (or by scene-index
// hash when not specified) so consecutive bold-statement scenes feel
// different:
//   - "centered" (default): everything on the vertical centerline
//   - "left-anchored": hero hugs the left edge, lead above
//   - "stacked-bottom": lead at top, hero anchored to lower 40%
//
// Animation:
//   - Lead phrase fades + slides up
//   - Hero word-by-word reveal (each word lands on a beat)
//   - Emphasis word reveals per-letter with kinetic-typography stagger
//   - Trail phrase fades after the hero settles
//
// Forced line breaks: if the agent emits `\n` in `hero`, the renderer
// honors them — useful for "the / big / problem" newspaper layouts.

"use client";

import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { paceEasing, paceStaggerFrames } from "../../motion/pace";
import { fitText } from "../../motion/fitText";
import { brandSignature } from "../../motion/brandSignature";
import { getMoodConfig, adjustSaturation } from "../../motion/mood";
import type { BrandTokens, VideoDesign } from "../../types";
import type { BoldStatementShape as BaseShape } from "../types";

// Extends the shared shape with editorial-bold-specific fields.
export type BoldStatementShape = BaseShape & {
  // Optional layout override. When omitted, renderer picks via index
  // hash (deterministic — same draft renders identically every time).
  layout?: "centered" | "left-anchored" | "stacked-bottom";
};

export type { BoldStatementShape as BaseBoldStatementShape };

type Props = {
  tokens: BrandTokens;
  scene: BoldStatementShape;
  design: Required<VideoDesign>;
  // Caller (ScriptReel) can pass a stable index for layout rotation.
  // Defaults to a hash of the scene's `hero` so renders are stable.
  sceneIndex?: number;
};

export const BoldStatementScene: React.FC<Props> = ({
  tokens,
  scene,
  design,
  sceneIndex,
}) => {
  const frame = useCurrentFrame();
  const baseEasing = paceEasing(design.pace);
  const baseStagger = paceStaggerFrames(design.pace);
  const mood = getMoodConfig(design.mood);
  const sig = brandSignature(tokens.businessName);

  // Mood adjusts accent saturation + stagger pacing.
  const rawAccent = accentColor(design.accent, tokens);
  const accent = adjustSaturation(rawAccent, mood.accentSaturation);
  const stagger = Math.round(baseStagger * mood.paceFactor);
  const easing = baseEasing;

  // BrandKit-aware backgrounds. Two brands with different palettes
  // now actually look different. Falls back to editorial-bold's
  // white-on-black defaults only when BrandKit doesn't supply a
  // value.
  const bg = mood.bgTint || tokens.bg || "#FFFFFF";
  const ink = tokens.ink || "#0F0F0F";
  const inkLight = tokens.ink3 || "#5A5A5A";

  // Layout rotation seeded by brand signature so two brands cycle
  // variants in different orders. Same brand always renders the
  // same scene the same way (deterministic).
  const variants: NonNullable<BoldStatementShape["layout"]>[] = [
    "centered",
    "left-anchored",
    "stacked-bottom",
  ];
  const idx =
    sceneIndex ??
    [...scene.hero].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const layout =
    scene.layout ??
    variants[(idx + sig.seed) % variants.length] ??
    "centered";

  // Decide which word in `hero` is the emphasis. Default: last word.
  const heroLines = scene.hero.split(/\n/);
  const emphasisLower = (scene.emphasis ?? lastWord(scene.hero)).toLowerCase();

  // Hero font size — fit the whole phrase across at most N lines.
  const heroFontSize = fitText({
    text: scene.hero,
    maxSize: layout === "stacked-bottom" ? 200 : 220,
    minSize: 88,
    advance: 0.52,
    maxLines: Math.max(heroLines.length, scene.hero.length > 30 ? 3 : 2),
  });

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
  const wordList = scene.hero
    .split(/(\s+|\n)/)
    .filter((s) => s.length > 0);
  const totalNonWhitespaceWords = wordList.filter(
    (w) => !/^\s+$/.test(w) && w !== "\n",
  ).length;
  const heroEnd = heroStart + totalNonWhitespaceWords * (stagger * 0.55) + stagger * 1.4;

  const trailStart = heroEnd + Math.round(stagger * 0.6);
  const trailOpacity = interpolate(
    frame,
    [trailStart, trailStart + stagger],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Layout-specific container styles
  const containerStyle: React.CSSProperties =
    layout === "left-anchored"
      ? {
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "120px 80px",
          textAlign: "left",
        }
      : layout === "stacked-bottom"
        ? {
            alignItems: "flex-start",
            justifyContent: "flex-start",
            padding: "120px 80px 220px 80px",
            textAlign: "left",
          }
        : {
            alignItems: "center",
            justifyContent: "center",
            padding: "120px 80px",
            textAlign: "center",
          };

  const heroAlign =
    layout === "centered" ? ("center" as const) : ("left" as const);

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
          display: "flex",
          flexDirection: "column",
          gap: scene.lead || scene.trail ? 48 : 0,
          ...containerStyle,
        }}
      >
        {/* Lead — placement varies by layout */}
        {scene.lead && layout !== "stacked-bottom" ? (
          <div
            style={{
              fontSize: supportFontSize,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              color: inkLight,
              opacity: leadOpacity,
              transform: `translateY(${leadY}px)`,
              textAlign: heroAlign,
              lineHeight: 1.2,
              alignSelf: heroAlign === "left" ? "flex-start" : "center",
            }}
          >
            {scene.lead}
          </div>
        ) : null}

        {/* Stacked-bottom layout puts the lead at the very top */}
        {scene.lead && layout === "stacked-bottom" ? (
          <div
            style={{
              position: "absolute",
              top: 140,
              left: 80,
              right: 80,
              fontSize: supportFontSize,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              color: inkLight,
              opacity: leadOpacity,
              transform: `translateY(${leadY}px)`,
              textAlign: "left",
              lineHeight: 1.2,
            }}
          >
            {scene.lead}
          </div>
        ) : null}

        <div
          style={{
            fontSize: heroFontSize,
            // Mood drives weight; signature flavor adjusts tracking.
            fontWeight: mood.displayWeight,
            letterSpacing:
              sig.typographyFlavor === "tight"
                ? "-0.05em"
                : sig.typographyFlavor === "loose"
                  ? "-0.02em"
                  : "-0.04em",
            lineHeight: 0.95,
            color: ink,
            textAlign: heroAlign,
            wordBreak: "break-word",
            overflowWrap: "anywhere",
            maxWidth: "100%",
            ...(layout === "stacked-bottom"
              ? { marginTop: "auto", paddingBottom: 60 }
              : {}),
          }}
        >
          {wordList.map((token, i) => {
            // Forced line break — agent can emit \n inside `hero` for
            // newspaper-style line stacking.
            if (token === "\n") {
              return <div key={i} style={{ width: "100%", height: 0 }} />;
            }
            // Whitespace tokens render as-is.
            if (/^\s+$/.test(token)) return <span key={i}>{token}</span>;

            // Per-word stagger.
            const wordIndex = wordList
              .slice(0, i)
              .filter((w) => !/^\s+$/.test(w) && w !== "\n").length;
            const start = heroStart + wordIndex * (stagger * 0.55);

            const cleaned = token.replace(/[^\p{L}\p{N}']/gu, "").toLowerCase();
            const isEmphasis = cleaned.length > 0 && cleaned === emphasisLower;

            // Per-LETTER reveal for the emphasis word (kinetic
            // typography). Plain word-fade for others — keeps the
            // animation budget where the eye is meant to land.
            if (isEmphasis) {
              const letters = [...token];
              const fontStyle =
                mood.emphasisItalic ||
                sig.typographyFlavor === "editorial"
                  ? ("italic" as const)
                  : ("normal" as const);
              return (
                <span
                  key={i}
                  style={{ display: "inline-block", fontStyle }}
                >
                  {letters.map((letter, li) => {
                    const letterStart = start + li * mood.letterStagger;
                    const opacity = interpolate(
                      frame,
                      [letterStart, letterStart + stagger * 0.9],
                      [0, 1],
                      {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      },
                    );
                    const ty = interpolate(
                      frame,
                      [letterStart, letterStart + stagger],
                      [22, 0],
                      {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                        easing,
                      },
                    );
                    return (
                      <span
                        key={li}
                        style={{
                          display: "inline-block",
                          color: accent,
                          opacity,
                          transform: `translateY(${ty}px)`,
                        }}
                      >
                        {letter}
                      </span>
                    );
                  })}
                </span>
              );
            }

            // Regular word — single fade + slide.
            const opacity = interpolate(
              frame,
              [start, start + stagger * 1.2],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );
            const ty = interpolate(
              frame,
              [start, start + stagger * 1.2],
              [16, 0],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing,
              },
            );
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  color: ink,
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
              textAlign: heroAlign,
              lineHeight: 1.2,
              alignSelf: heroAlign === "left" ? "flex-start" : "center",
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
