// EditorialOpenerScene — the opening beat of an editorial-bold reel.
// A small recurring brand mark (icon) at the top of the frame casts
// a soft accent-colored spotlight downward; below the spotlight,
// a heavy display headline introduces the reel's premise.
//
// Reference: Empire Labs reels' opener with the eye icon and beam
// pointing at the content below.
//
// Animation:
//   - Mark scales in with a small spring at frame 4
//   - Spotlight beam fades in beneath at frame 10 with a vertical
//     gradient drawing from the mark downward
//   - Headline fades + word-staggers in at frame 18
//
// Composition:
//   - Brand mark sits in the upper third
//   - Spotlight beam: a vertical wedge from the mark, fading to
//     transparent
//   - Headline below center, mixed-weight type

"use client";

import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { Icon } from "../../primitives/Icon";
import { paceEasing, paceStaggerFrames } from "../../motion/pace";
import { fitText } from "../../motion/fitText";
import { brandSignature } from "../../motion/brandSignature";
import { getMoodConfig, adjustSaturation } from "../../motion/mood";
import {
  CameraMove,
  ParticleField,
  AccentRule,
  composeMotion,
} from "../../motion/primitives";
import { isIconName } from "../../icons";
import type { BrandTokens, VideoDesign } from "../../types";
import type { EditorialOpenerShape } from "../types";

export type { EditorialOpenerShape };

type Props = {
  tokens: BrandTokens;
  scene: EditorialOpenerShape;
  design: Required<VideoDesign>;
  // Used by composeMotion to seed per-render variety. Default 0
  // (the opener is almost always scene 0 in the reel anyway, but
  // this lets the same brand cycle different opener treatments
  // across drafts).
  sceneIndex?: number;
};

export const EditorialOpenerScene: React.FC<Props> = ({
  tokens,
  scene,
  design,
  sceneIndex = 0,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const baseEasing = paceEasing(design.pace);
  const baseStagger = paceStaggerFrames(design.pace);
  const mood = getMoodConfig(design.mood);
  const sig = brandSignature(tokens.businessName);
  const easing = baseEasing;
  const stagger = Math.round(baseStagger * mood.paceFactor);

  // Seeded recipe — gives the opener variety across renders.
  // Uses the bold-statement pool (camera + particles) since opener
  // and closer are structurally similar to body scenes for these
  // primitives.
  const recipe = composeMotion({
    brandSeed: sig.seed,
    sceneIndex,
    sceneType: "bold-statement",
    mood: design.mood,
  });

  const rawAccent = accentColor(design.accent, tokens);
  const accent = adjustSaturation(rawAccent, mood.accentSaturation);

  // BrandKit-aware so brands with cream/dark backgrounds don't all
  // render as stark white.
  const bg = mood.bgTint || tokens.bg || "#FFFFFF";
  const ink = tokens.ink || "#0F0F0F";

  // Motif precedence: explicit agent choice → brand signature default
  // → "sparkle" fallback. Two brands without an explicit motif now
  // get visibly different default glyphs.
  const motifName = isIconName(scene.motif)
    ? scene.motif
    : isIconName(sig.defaultMotif)
      ? sig.defaultMotif
      : "sparkle";

  // Mark + spotlight animation
  const markScale = interpolate(frame, [4, 4 + stagger * 1.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.4)),
  });
  const beamOpacity = interpolate(
    frame,
    [4 + stagger, 4 + stagger * 3],
    [0, 0.7],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Headline animation
  const headlineWords = scene.headline.split(/(\s+|\n)/).filter((s) => s.length > 0);
  const emphasisLower = (scene.emphasis ?? "").toLowerCase();
  const headlineStart = 4 + stagger * 2.5;

  const headlineFontSize = fitText({
    text: scene.headline,
    maxSize: 180,
    minSize: 72,
    advance: 0.52,
    maxLines: 3,
  });

  const inner = (
    <AbsoluteFill
      style={{
        background: bg,
        color: ink,
        fontFamily:
          '"SF Pro Display", "Inter", -apple-system, sans-serif',
      }}
    >
      {/* Brand mark — upper third */}
      <div
        style={{
          position: "absolute",
          top: 200,
          left: "50%",
          transform: `translateX(-50%) scale(${markScale})`,
          color: accent,
        }}
      >
        <Icon name={motifName} size={120} strokeWidth={2.5} color={accent} />
      </div>

      {/* Spotlight beam from mark downward */}
      <div
        style={{
          position: "absolute",
          top: 320,
          left: "50%",
          transform: "translateX(-50%)",
          width: 520,
          height: 480,
          opacity: beamOpacity,
          pointerEvents: "none",
          background: `linear-gradient(180deg, ${alphaColor(
            accent,
            0.45,
          )} 0%, ${alphaColor(accent, 0)} 100%)`,
          clipPath: "polygon(40% 0%, 60% 0%, 100% 100%, 0% 100%)",
        }}
      />

      {/* Headline — lower middle */}
      <div
        style={{
          position: "absolute",
          top: 920,
          left: 80,
          right: 80,
          fontSize: headlineFontSize,
          fontWeight: 800,
          letterSpacing: "-0.04em",
          lineHeight: 0.95,
          color: ink,
          textAlign: "center",
        }}
      >
        {headlineWords.map((token, i) => {
          if (token === "\n")
            return <div key={i} style={{ height: 0, width: "100%" }} />;
          if (/^\s+$/.test(token)) return <span key={i}>{token}</span>;

          const wordIndex = headlineWords
            .slice(0, i)
            .filter((w) => !/^\s+$/.test(w) && w !== "\n").length;
          const wordStart = headlineStart + wordIndex * (stagger * 0.7);
          const opacity = interpolate(
            frame,
            [wordStart, wordStart + stagger * 1.4],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          const ty = interpolate(
            frame,
            [wordStart, wordStart + stagger * 1.4],
            [16, 0],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing,
            },
          );

          const cleaned = token.replace(/[^\p{L}\p{N}']/gu, "").toLowerCase();
          const isEmphasis =
            emphasisLower.length > 0 && cleaned === emphasisLower;
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
    </AbsoluteFill>
  );

  // Compose inner scene with seeded primitives. Particles below
  // text (zIndex 1 vs 2). CameraMove wraps the whole composition
  // for cinematic open. Without this every reel opens with the
  // same static frame — the user feedback "all primitives for
  // start and ending the video are same" was about exactly this.
  const cameraStyle = recipe.cameraStyle ?? "none";
  const particleFlavor = recipe.particleFlavor ?? "none";

  const composed = (
    <AbsoluteFill>
      {particleFlavor !== "none" ? (
        <ParticleField
          flavor={particleFlavor}
          seed={recipe.seed}
          opacity={0.3}
        />
      ) : null}
      <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
        {inner}
      </div>
    </AbsoluteFill>
  );

  return cameraStyle !== "none" ? (
    <CameraMove
      style={cameraStyle}
      totalFrames={durationInFrames}
      intensity={mood.paceFactor}
    >
      {composed}
    </CameraMove>
  ) : (
    composed
  );
};

function alphaColor(color: string, alpha: number): string {
  const hex = color.startsWith("#") ? color.slice(1) : color;
  if (hex.length !== 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
