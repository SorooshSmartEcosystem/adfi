// TitleCardScene — film-style title card. Letterbox black bars
// animate in from top + bottom over the first 12 frames, the
// headline does a slow zoom-in (0.92 → 1.0 over the full duration)
// while word-by-word fading in, optional kicker line in mono
// uppercase below, optional period accent at the end like a movie
// title card. Reads as "this is a chapter heading" rather than
// "this is a slide."
//
// Use for:
//  - Opening beats where you want a cinematic pause before the
//    content starts
//  - Major section breaks within a longer reel
//  - Dramatic pivots / "and then" moments
//
// Visual contract:
//  - Letterbox bars are 14% of frame height, top + bottom, true black
//  - Background is BrandKit.bg (light or dark depending on preset)
//  - Headline: heavy display, 96-180px, fitText-resolved
//  - Mood-aware: confident/urgent → faster zoom + tighter stagger;
//    contemplative/calm → slower zoom + looser stagger

"use client";

import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { fitText } from "../../motion/fitText";
import { paceEasing, paceStaggerFrames } from "../../motion/pace";
import { getMoodConfig, adjustSaturation } from "../../motion/mood";
import type { BrandTokens, VideoDesign } from "../../types";
import type { TitleCardShape } from "../types";

type Props = {
  tokens: BrandTokens;
  scene: TitleCardShape;
  design: Required<VideoDesign>;
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

export const TitleCardScene: React.FC<Props> = ({ tokens, scene, design }) => {
  const frame = useCurrentFrame();
  const totalFrames = Math.max(60, Math.round(scene.duration * 30));
  const mood = getMoodConfig(design.mood);
  const easing = paceEasing(design.pace);
  const stagger = Math.round(paceStaggerFrames(design.pace) * mood.paceFactor);

  const bg = tokens.bg || "#FFFFFF";
  const ink = tokens.ink || "#0F0F0F";
  const inkLight = tokens.ink3 || "#5A5A5A";
  const accent = adjustSaturation(
    accentFor(design.accent, tokens),
    mood.accentSaturation,
  );

  // Letterbox bars: animate in 0 → 14% over first 12 frames, hold,
  // animate out over last 8 frames so the next scene gets the full
  // frame back without a hard cut.
  const barIn = interpolate(frame, [0, 12], [0, 0.14], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: "clamp",
  });
  const barOut = interpolate(
    frame,
    [totalFrames - 8, totalFrames],
    [0.14, 0],
    { easing: Easing.in(Easing.cubic), extrapolateLeft: "clamp" },
  );
  const barHeight =
    frame < totalFrames - 8 ? barIn : barOut;

  // Slow zoom on the headline group: 0.92 → 1.0 over the full
  // duration. Eased so the move is felt but never frantic.
  const zoom = interpolate(frame, [0, totalFrames], [0.92, 1.0], {
    easing: Easing.inOut(Easing.ease),
    extrapolateRight: "clamp",
  });

  // Word-by-word fade-in starting after the bars settle.
  const words = scene.headline.split(/\s+/).filter(Boolean);
  const wordStartOffset = 14;

  const fontSize = fitText({
    text: scene.headline,
    containerWidth: 880,
    maxLines: 3,
    maxSize: 188,
    minSize: 88,
    advance: 0.52,
  });

  const kickerOpacity = interpolate(frame, [6, 6 + stagger], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

  const captionOpacity = interpolate(
    frame,
    [
      wordStartOffset + words.length * stagger,
      wordStartOffset + words.length * stagger + 14,
    ],
    [0, 0.78],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing },
  );

  const emphasisLower = (scene.emphasis ?? "").toLowerCase().trim();

  return (
    <AbsoluteFill style={{ background: bg, color: ink }}>
      {/* Top letterbox bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: `${barHeight * 100}%`,
          background: "#000",
          zIndex: 10,
        }}
      />
      {/* Bottom letterbox bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: `${barHeight * 100}%`,
          background: "#000",
          zIndex: 10,
        }}
      />

      {/* Center stack: kicker → headline → caption */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 80px",
          gap: 32,
          transform: `scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        {scene.kicker ? (
          <div
            style={{
              fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: "0.32em",
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
            fontSize,
            lineHeight: 0.96,
            letterSpacing: "-0.04em",
            textAlign: "center",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "0.24em",
            maxWidth: 920,
          }}
        >
          {words.map((word, i) => {
            const start = wordStartOffset + i * stagger;
            const end = start + 14;
            const opacity = interpolate(frame, [start, end], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing,
            });
            const ty = interpolate(frame, [start, end], [12, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            });
            const isAccent =
              emphasisLower &&
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
                {scene.withPeriod && i === words.length - 1 ? (
                  <span style={{ color: accent }}>.</span>
                ) : null}
              </span>
            );
          })}
        </div>

        {scene.caption ? (
          <div
            style={{
              fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
              fontSize: 20,
              fontWeight: 400,
              letterSpacing: "0.12em",
              textTransform: "lowercase",
              color: inkLight,
              opacity: captionOpacity,
              maxWidth: 720,
              textAlign: "center",
              lineHeight: 1.4,
            }}
          >
            {scene.caption}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
