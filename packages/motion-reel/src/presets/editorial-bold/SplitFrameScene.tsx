// SplitFrameScene — half-photo / half-text composition. Vertical
// divider line down the middle separates a parallax-zooming photo
// (left or right) from a stacked text block on the other side.
// Photo zooms slowly (parallax / Ken-Burns), text reveals
// line-by-line. Reads as editorial magazine spread, not Instagram
// reel template.
//
// Use for:
//  - Side-by-side comparisons (visual + claim)
//  - Customer/business moments where a photo grounds the copy
//  - Beats where the text needs context but a full hero-photo
//    would steal focus
//
// Visual contract:
//  - 50/50 split with a 1px hairline divider in BrandKit border color
//  - Photo side: Ken-Burns zoom from 1.0 → 1.08 over scene duration
//  - Text side: kicker (mono) → headline (heavy display) → support
//    line (regular). Stagger reveals line by line.
//  - photoSide: "left" | "right" — agent picks; renderer rotates
//    by index when omitted to add per-reel variety.

"use client";

import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { fitText } from "../../motion/fitText";
import { paceEasing, paceStaggerFrames } from "../../motion/pace";
import { getMoodConfig, adjustSaturation } from "../../motion/mood";
import type { BrandTokens, VideoDesign } from "../../types";
import type { SplitFrameShape } from "../types";

type Props = {
  tokens: BrandTokens;
  scene: SplitFrameShape;
  design: Required<VideoDesign>;
  sceneIndex?: number;
};

function accentFor(accent: VideoDesign["accent"], tokens: BrandTokens): string {
  switch (accent) {
    case "alive":
      return tokens.alive;
    case "attn":
      return tokens.attnText;
    case "urgent":
      return "#E5484D";
    case "ink":
    default:
      return tokens.ink;
  }
}

export const SplitFrameScene: React.FC<Props> = ({
  tokens,
  scene,
  design,
  sceneIndex = 0,
}) => {
  const frame = useCurrentFrame();
  const totalFrames = Math.max(60, Math.round(scene.duration * 30));
  const mood = getMoodConfig(design.mood);
  const easing = paceEasing(design.pace);
  const stagger = Math.round(paceStaggerFrames(design.pace) * mood.paceFactor);

  const bg = tokens.bg || "#FFFFFF";
  const ink = tokens.ink || "#0F0F0F";
  const inkLight = tokens.ink3 || "#5A5A5A";
  const border = tokens.border || "#E0E0E0";
  const surface = tokens.surface || "#F5F5F5";
  const accent = adjustSaturation(
    accentFor(design.accent, tokens),
    mood.accentSaturation,
  );

  // photoSide: agent value or rotate by scene index for variety.
  const photoOnLeft =
    scene.photoSide === "right"
      ? false
      : scene.photoSide === "left"
        ? true
        : sceneIndex % 2 === 0;

  // Ken-Burns: photo scales 1.0 → 1.08 over duration. Subtle
  // movement, not a zoom-in punch.
  const photoScale = interpolate(frame, [0, totalFrames], [1.0, 1.08], {
    easing: Easing.inOut(Easing.ease),
    extrapolateRight: "clamp",
  });

  // Photo opacity fade-in over first 10 frames.
  const photoOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Text reveals: kicker → headline → support, each staggered.
  const kickerStart = 8;
  const headlineStart = kickerStart + stagger;
  const supportStart = headlineStart + stagger * 2.5;

  const kickerOpacity = interpolate(
    frame,
    [kickerStart, kickerStart + stagger],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing },
  );
  const supportOpacity = interpolate(
    frame,
    [supportStart, supportStart + stagger],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing },
  );

  const words = scene.headline.split(/\s+/).filter(Boolean);
  const emphasisLower = (
    scene.emphasis ?? words[words.length - 1] ?? ""
  ).toLowerCase();

  const headlineSize = fitText({
    text: scene.headline,
    containerWidth: 460,
    maxLines: 4,
    maxSize: 84,
    minSize: 38,
    advance: 0.52,
  });

  const photoColumn: React.CSSProperties = {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "50%",
    overflow: "hidden",
    background: surface,
    [photoOnLeft ? "left" : "right"]: 0,
  };

  const textColumn: React.CSSProperties = {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "50%",
    [photoOnLeft ? "right" : "left"]: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: photoOnLeft ? "flex-start" : "flex-end",
    padding: "120px 56px",
    gap: 28,
    textAlign: photoOnLeft ? "left" : "right",
  };

  return (
    <AbsoluteFill style={{ background: bg }}>
      {/* Photo column */}
      <div style={photoColumn}>
        {scene.imageUrl ? (
          <img
            src={scene.imageUrl}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${photoScale})`,
              opacity: photoOpacity,
              transformOrigin: "center center",
            }}
          />
        ) : (
          // Fallback: flat surface tint with a subtle gradient so the
          // empty side doesn't read as broken.
          <div
            style={{
              width: "100%",
              height: "100%",
              background: `linear-gradient(135deg, ${surface} 0%, ${border} 100%)`,
              opacity: photoOpacity,
            }}
          />
        )}
      </div>

      {/* Hairline divider down the middle */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: "50%",
          width: 1,
          background: border,
          opacity: 0.6,
        }}
      />

      {/* Text column */}
      <div style={textColumn}>
        {scene.kicker ? (
          <div
            style={{
              fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
              fontSize: 18,
              fontWeight: 500,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: inkLight,
              opacity: kickerOpacity,
            }}
          >
            {scene.kicker}
          </div>
        ) : null}

        <div
          style={{
            fontFamily: '"SF Pro Display", "Inter Display", sans-serif',
            fontWeight: 800,
            fontSize: headlineSize,
            lineHeight: 1.04,
            letterSpacing: "-0.035em",
            color: ink,
            display: "flex",
            flexWrap: "wrap",
            gap: "0.24em",
            justifyContent: photoOnLeft ? "flex-start" : "flex-end",
          }}
        >
          {words.map((word, i) => {
            const start = headlineStart + i * stagger;
            const end = start + 14;
            const opacity = interpolate(frame, [start, end], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing,
            });
            const ty = interpolate(frame, [start, end], [14, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            });
            const isAccent =
              word.toLowerCase().replace(/[.,!?;:]/g, "") === emphasisLower;
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  opacity,
                  transform: `translateY(${ty}px)`,
                  color: isAccent ? accent : ink,
                }}
              >
                {word}
              </span>
            );
          })}
        </div>

        {scene.support ? (
          <div
            style={{
              fontFamily: '"Inter", -apple-system, sans-serif',
              fontSize: 20,
              fontWeight: 400,
              lineHeight: 1.45,
              color: inkLight,
              opacity: supportOpacity,
              maxWidth: 420,
            }}
          >
            {scene.support}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
