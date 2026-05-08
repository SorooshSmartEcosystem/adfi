// HeroPhotoScene — full-bleed AI-generated photo with a heavy display
// text overlay anchored to a configurable corner. Adds real-world
// atmosphere to reels that would otherwise be all-text editorial.
//
// Visual contract:
// - Photo fills the frame. Slow Ken-Burns zoom (1.0 → 1.06 over scene
//   duration) so the image isn't static.
// - Treatment overlay (default `darken`) ensures text contrast.
// - Headline sits in the chosen corner. Word-by-word reveal so the
//   reader's eye lands on the photo first, text second.
// - Emphasis word colors via accent (last word default).
// - Optional subhead in mono support type.
//
// If `imageUrl` is missing (e.g. backfill failed), the scene falls
// back to a solid surface with the overlay text — still ships, just
// without the photo. No render errors on partial state.

"use client";

import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { fitText } from "../../motion/fitText";
import { paceEasing, paceStaggerFrames } from "../../motion/pace";
import type { BrandTokens, VideoDesign } from "../../types";
import type { HeroPhotoShape } from "../types";

type Props = {
  tokens: BrandTokens;
  scene: HeroPhotoShape;
  design: Required<VideoDesign>;
};

const ANCHOR_STYLES: Record<string, React.CSSProperties> = {
  "top-left": { top: 80, left: 64, alignItems: "flex-start", textAlign: "left" },
  "bottom-left": {
    bottom: 120,
    left: 64,
    alignItems: "flex-start",
    textAlign: "left",
  },
  "bottom-right": {
    bottom: 120,
    right: 64,
    alignItems: "flex-end",
    textAlign: "right",
  },
  center: {
    top: "50%",
    left: 0,
    right: 0,
    transform: "translateY(-50%)",
    alignItems: "center",
    textAlign: "center",
  },
};

function accentColor(accent: VideoDesign["accent"], tokens: BrandTokens): string {
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

function treatmentOverlay(
  treatment: HeroPhotoShape["treatment"],
): React.CSSProperties | null {
  switch (treatment) {
    case "lighten":
      return { background: "rgba(255, 255, 255, 0.28)" };
    case "vignette":
      return {
        background:
          "radial-gradient(ellipse at center, rgba(0,0,0,0) 35%, rgba(0,0,0,0.55) 100%)",
      };
    case "none":
      return null;
    case "darken":
    default:
      return { background: "rgba(0, 0, 0, 0.32)" };
  }
}

export const HeroPhotoScene: React.FC<Props> = ({ tokens, scene, design }) => {
  const frame = useCurrentFrame();
  const totalFrames = Math.max(60, Math.round(scene.duration * 30));

  const anchor = scene.textAnchor ?? "bottom-left";
  const treatment = scene.treatment ?? "darken";
  const overlay = treatmentOverlay(treatment);
  // Light treatment uses ink; everything else uses white for legibility.
  const baseTextColor = treatment === "lighten" ? tokens.ink : "#FFFFFF";
  const accent = accentColor(design.accent, tokens);

  // Slow Ken-Burns — 1.00 → 1.06 over the whole scene so the image
  // isn't static. Eased so the move is visible but never frantic.
  const kenBurnsScale = interpolate(frame, [0, totalFrames], [1.0, 1.06], {
    easing: Easing.inOut(Easing.ease),
    extrapolateRight: "clamp",
  });

  // Photo fade-in over first 12 frames — covers any image-load flash
  // on Lambda render and matches the editorial preset's slow openings.
  const photoOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Word-by-word headline reveal. Stagger respects the pace knob.
  const words = scene.headline.split(/\s+/).filter(Boolean);
  const stagger = paceStaggerFrames(design.pace);
  const headlineSize = fitText({
    text: scene.headline,
    containerWidth: 920,
    maxLines: 3,
    maxSize: 132,
    minSize: 56,
  });

  // Emphasis: use scene.emphasis if provided, else last word.
  const emphasisWord = scene.emphasis?.trim() || words[words.length - 1] || "";

  const anchorStyle: React.CSSProperties =
    ANCHOR_STYLES[anchor] ?? ANCHOR_STYLES["bottom-left"]!;

  return (
    <AbsoluteFill style={{ background: tokens.surface ?? "#0F0F0F" }}>
      {scene.imageUrl ? (
        <img
          src={scene.imageUrl}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${kenBurnsScale})`,
            opacity: photoOpacity,
          }}
        />
      ) : null}

      {overlay ? (
        <AbsoluteFill style={overlay} />
      ) : null}

      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          maxWidth: 920,
          gap: 16,
          ...anchorStyle,
        }}
      >
        <div
          style={{
            color: baseTextColor,
            fontFamily:
              "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
            fontWeight: 800,
            fontSize: headlineSize,
            lineHeight: 0.96,
            letterSpacing: "-0.04em",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.22em",
            justifyContent:
              anchor === "bottom-right"
                ? "flex-end"
                : anchor === "center"
                  ? "center"
                  : "flex-start",
          }}
        >
          {words.map((word, i) => {
            const wordStart = i * stagger;
            const wordEnd = wordStart + 12;
            const wordOpacity = interpolate(frame, [wordStart, wordEnd], [0, 1], {
              easing: paceEasing(design.pace),
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const wordY = interpolate(frame, [wordStart, wordEnd], [16, 0], {
              easing: paceEasing(design.pace),
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const isAccent =
              word.toLowerCase().replace(/[.,!?;:]/g, "") ===
              emphasisWord.toLowerCase().replace(/[.,!?;:]/g, "");
            return (
              <span
                key={i}
                style={{
                  opacity: wordOpacity,
                  transform: `translateY(${wordY}px)`,
                  color: isAccent ? accent : baseTextColor,
                  display: "inline-block",
                }}
              >
                {word}
              </span>
            );
          })}
        </div>

        {scene.subhead ? (
          <div
            style={{
              color: baseTextColor,
              fontFamily:
                "'SF Mono', 'Inter', -apple-system, BlinkMacSystemFont, monospace",
              fontWeight: 500,
              fontSize: 22,
              letterSpacing: "0.02em",
              maxWidth: 720,
              lineHeight: 1.4,
              opacity: interpolate(
                frame,
                [words.length * stagger, words.length * stagger + 14],
                [0, 0.88],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              ),
            }}
          >
            {scene.subhead}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
