// PullQuoteScene — magazine-style pull quote. Big serif open-quote
// glyph in the corner, the quote in editorial italic display,
// optional attribution in mono small-caps below, an ornament rule
// (centered horizontal line with a dot in the middle) separates
// the quote from the attribution.
//
// Visually distinct from QuoteScene (which uses sans-serif and a
// typewriter reveal) — this is the "magazine layout" treatment for
// when a brand voice wants gravity/authority around a single
// statement.
//
// Use for:
//  - Authority-driven quotes ("Bezos said…", "the founder told me…")
//  - Single-statement reels where one line carries the whole post
//  - Reflective beats inside a longer reel
//
// Visual contract:
//  - Open-quote glyph: huge italic serif at top-left, accent color,
//    low opacity (0.18) — sits as backdrop, not foreground
//  - Quote: italic editorial serif, 56-92px, line-height 1.18
//  - Attribution: mono small-caps, ink3, 18px, after ornament rule
//  - Background: BrandKit bg (preset-aware — light or dark)

"use client";

import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { fitText } from "../../motion/fitText";
import { paceEasing } from "../../motion/pace";
import { getMoodConfig, adjustSaturation } from "../../motion/mood";
import { brandSignature } from "../../motion/brandSignature";
import {
  CameraMove,
  ParticleField,
  VignettePulse,
  composeMotion,
} from "../../motion/primitives";
import type { BrandTokens, VideoDesign } from "../../types";
import type { PullQuoteShape } from "../types";

type Props = {
  tokens: BrandTokens;
  scene: PullQuoteShape;
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

export const PullQuoteScene: React.FC<Props> = ({
  tokens,
  scene,
  design,
  sceneIndex = 0,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const totalFrames = Math.max(60, Math.round(scene.duration * 30));
  const mood = getMoodConfig(design.mood);
  const easing = paceEasing(design.pace);

  const bg = tokens.bg || "#FFFFFF";
  const ink = tokens.ink || "#0F0F0F";
  const inkLight = tokens.ink3 || "#5A5A5A";
  const border = tokens.border || "#D0D0D0";
  const accent = adjustSaturation(
    accentFor(design.accent, tokens),
    mood.accentSaturation,
  );

  const sig = brandSignature(tokens.businessName);
  const recipe = composeMotion({
    brandSeed: sig.seed,
    sceneIndex,
    sceneType: "bold-statement",
    mood: design.mood,
  });

  // Open-quote glyph fade-in over first 14 frames.
  const glyphOpacity = interpolate(frame, [0, 14], [0, 0.18], {
    extrapolateRight: "clamp",
  });
  // Subtle scale-up on the glyph as the scene plays.
  const glyphScale = interpolate(frame, [0, totalFrames], [0.94, 1.02], {
    easing: Easing.inOut(Easing.ease),
    extrapolateRight: "clamp",
  });

  // Quote reveals line-by-line. Split on natural break points
  // (period + space, semicolon, em-dash) but render as one block;
  // the stagger is on the whole-text opacity, not per-line.
  const quoteStart = 18;
  const quoteEnd = quoteStart + Math.round(totalFrames * 0.22);
  const quoteOpacity = interpolate(
    frame,
    [quoteStart, quoteEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing },
  );
  const quoteY = interpolate(frame, [quoteStart, quoteEnd], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Attribution + ornament come in after the quote settles.
  const attrStart = quoteEnd + 6;
  const attrOpacity = interpolate(
    frame,
    [attrStart, attrStart + 12],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing },
  );
  const ornamentScaleX = interpolate(
    frame,
    [attrStart, attrStart + 18],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    },
  );

  const quoteSize = fitText({
    text: scene.quote,
    containerWidth: 880,
    maxLines: 5,
    maxSize: 92,
    minSize: 44,
    advance: 0.46,
  });

  // Render quote with optional emphasis word coloring.
  const emphasisLower = (scene.emphasis ?? "").toLowerCase().trim();
  const quoteWords = scene.quote.split(/\s+/).filter(Boolean);

  const inner = (
    <AbsoluteFill style={{ background: bg }}>
      {/* Open-quote glyph backdrop */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 60,
          fontFamily: '"Playfair Display", "Iowan Old Style", Georgia, serif',
          fontSize: 380,
          fontWeight: 900,
          fontStyle: "italic",
          color: accent,
          opacity: glyphOpacity,
          lineHeight: 0.7,
          transform: `scale(${glyphScale})`,
          transformOrigin: "top left",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        “
      </div>

      {/* Center block: quote + ornament + attribution */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "120px 80px",
          gap: 56,
        }}
      >
        <div
          style={{
            fontFamily:
              '"Iowan Old Style", "Playfair Display", Georgia, serif',
            fontWeight: 600,
            fontStyle: "italic",
            fontSize: quoteSize,
            lineHeight: 1.18,
            letterSpacing: "-0.01em",
            color: ink,
            textAlign: "center",
            maxWidth: 920,
            opacity: quoteOpacity,
            transform: `translateY(${quoteY}px)`,
          }}
        >
          {emphasisLower
            ? quoteWords.map((word, i) => {
                const isAccent =
                  word.toLowerCase().replace(/[.,!?;:"']/g, "") ===
                  emphasisLower;
                return (
                  <span
                    key={i}
                    style={{ color: isAccent ? accent : ink }}
                  >
                    {word}
                    {i < quoteWords.length - 1 ? " " : ""}
                  </span>
                );
              })
            : scene.quote}
        </div>

        {scene.attribution ? (
          <>
            {/* Ornament: hairline rule with a centered accent dot */}
            <div
              style={{
                position: "relative",
                width: 320,
                height: 1,
                background: border,
                transform: `scaleX(${ornamentScaleX})`,
                transformOrigin: "center center",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -3,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: accent,
                  opacity: ornamentScaleX,
                }}
              />
            </div>

            <div
              style={{
                fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
                fontSize: 18,
                fontWeight: 500,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: inkLight,
                opacity: attrOpacity,
              }}
            >
              {scene.attribution}
            </div>
          </>
        ) : null}
      </div>
    </AbsoluteFill>
  );

  // Compose: pull quotes are reflective scenes — vignette + soft
  // particles + slow camera. Skip particles for calm moods.
  const cameraStyle = recipe.cameraStyle ?? "none";
  const particleFlavor = recipe.particleFlavor ?? "none";
  const vignette = recipe.vignette ?? "none";

  const composed = (
    <AbsoluteFill>
      {vignette !== "none" ? (
        <VignettePulse static={vignette === "static"} intensity={0.25} />
      ) : null}
      {particleFlavor !== "none" ? (
        <ParticleField
          flavor={particleFlavor}
          seed={recipe.seed}
          opacity={0.25}
        />
      ) : null}
      <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>{inner}</div>
    </AbsoluteFill>
  );

  return cameraStyle !== "none" ? (
    <CameraMove
      style={cameraStyle}
      totalFrames={durationInFrames}
      intensity={mood.paceFactor * 0.7} // gentler for reflective scenes
    >
      {composed}
    </CameraMove>
  ) : (
    composed
  );
};
