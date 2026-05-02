// HookScene — Stop-scroll opener. One huge stat or word that fills
// the frame, with a one-line subtitle beneath. The single most
// important scene — if this doesn't land in 1.5s, viewers swipe.

import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { PCMonoLabel } from "../primitives/PCMonoLabel";
import { BackdropIcon } from "../primitives/BackdropIcon";
import { paceEasing, paceStaggerFrames } from "../motion/pace";
import { fitText } from "../motion/fitText";
import { isIconName } from "../icons";
import type { BrandTokens, HookScene as HookSceneShape, VideoDesign } from "../types";

type Props = {
  tokens: BrandTokens;
  scene: HookSceneShape;
  design: Required<VideoDesign>;
};

export const HookScene: React.FC<Props> = ({ tokens, scene, design }) => {
  const frame = useCurrentFrame();
  const easing = paceEasing(design.pace);
  const stagger = paceStaggerFrames(design.pace);

  // Big number scales in + label fades up beneath. Stagger between
  // headline and subtitle is now pace-aware (slow paces breathe more).
  const headlineScale = interpolate(frame, [4, 4 + stagger * 2], [0.7, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
  const headlineOpacity = interpolate(frame, [4, 4 + stagger], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subtitleStart = 4 + stagger * 2;
  const subtitleOpacity = interpolate(
    frame,
    [subtitleStart, subtitleStart + stagger * 1.5],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const subtitleTy = interpolate(
    frame,
    [subtitleStart, subtitleStart + stagger * 1.5],
    [12, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    },
  );

  const isLight = design.style !== "bold";
  const bg = isLight ? tokens.bg : tokens.ink;
  const ink = isLight ? tokens.ink : "#FFFFFF";
  const accent = accentColor(design.accent, tokens);

  return (
    <AbsoluteFill
      style={{
        background: bg,
        fontFamily: '-apple-system, "SF Pro Display", Inter, sans-serif',
        color: ink,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 30%, ${
            isLight ? tokens.surface : "rgba(255,255,255,0.06)"
          } 0%, transparent 60%)`,
        }}
      />

      {/* Topical backdrop icon — ghost behind the headline. Brand-bound
          color: uses the same accent the headline uses, but at 5%
          opacity so it never competes with the type. */}
      {isIconName(scene.icon) ? (
        <BackdropIcon
          name={scene.icon}
          color={accent}
          opacity={isLight ? 0.07 : 0.1}
          size={1300}
          anchor="center"
        />
      ) : null}

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          padding: "0 64px",
        }}
      >
        <PCMonoLabel tone={design.accent} color={isLight ? undefined : "rgba(255,255,255,0.55)"}>
          {design.statusLabel}
        </PCMonoLabel>

        <div
          style={{
            fontSize: fitText({
              text: scene.headline,
              maxSize: 320,
              minSize: 96,
              maxLines: scene.headline.length > 22 ? 3 : 2,
            }),
            fontWeight: 700,
            letterSpacing: "-0.06em",
            lineHeight: 0.9,
            color: accent,
            opacity: headlineOpacity,
            transform: `scale(${headlineScale})`,
            textAlign: "center",
            wordBreak: "break-word",
            overflowWrap: "anywhere",
            maxWidth: "100%",
          }}
        >
          {scene.headline}
        </div>

        {scene.subtitle ? (
          <div
            style={{
              fontSize: 40,
              fontWeight: 500,
              lineHeight: 1.25,
              letterSpacing: "-0.015em",
              color: ink,
              maxWidth: 880,
              textAlign: "center",
              opacity: subtitleOpacity,
              transform: `translateY(${subtitleTy}px)`,
            }}
          >
            {scene.subtitle}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

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
      return tokens.ink;
  }
}
