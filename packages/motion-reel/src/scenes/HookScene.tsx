// HookScene — Stop-scroll opener. One huge stat or word that fills
// the frame, with a one-line subtitle beneath. The single most
// important scene — if this doesn't land in 1.5s, viewers swipe.

import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { PCMonoLabel } from "../primitives/PCMonoLabel";
import type { BrandTokens, HookScene as HookSceneShape, VideoDesign } from "../types";

type Props = {
  tokens: BrandTokens;
  scene: HookSceneShape;
  design: Required<VideoDesign>;
};

export const HookScene: React.FC<Props> = ({ tokens, scene, design }) => {
  const frame = useCurrentFrame();

  // Big number scales in + label fades up beneath
  const headlineScale = interpolate(frame, [4, 24], [0.7, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.4)),
  });
  const headlineOpacity = interpolate(frame, [4, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subtitleOpacity = interpolate(frame, [22, 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subtitleTy = interpolate(frame, [22, 38], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

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
            fontSize: 320,
            fontWeight: 700,
            letterSpacing: "-0.06em",
            lineHeight: 0.9,
            color: accent,
            opacity: headlineOpacity,
            transform: `scale(${headlineScale})`,
            textAlign: "center",
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
