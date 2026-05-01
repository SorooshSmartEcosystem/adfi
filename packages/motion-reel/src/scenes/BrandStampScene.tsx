// BrandStampScene — Closer scene. Brand mark + business name + optional
// CTA. Always the last beat of a script. Always feels the same so
// viewers learn to recognize ADFI-rendered videos.

import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { BrandMark } from "../primitives/BrandMark";
import type { BrandTokens, BrandStampScene as BrandStampShape, VideoDesign } from "../types";

type Props = {
  tokens: BrandTokens;
  scene: BrandStampShape;
  design: Required<VideoDesign>;
};

export const BrandStampScene: React.FC<Props> = ({ tokens, scene, design }) => {
  const frame = useCurrentFrame();
  const isLight = design.style !== "bold";
  const bg = isLight ? tokens.bg : tokens.ink;
  const ink = isLight ? tokens.ink : "#FFFFFF";
  const accent = accentColor(design.accent, tokens);

  const stampScale = interpolate(frame, [4, 30], [0.88, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.2)),
  });
  const stampOpacity = interpolate(frame, [4, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ctaOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

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
          background: `radial-gradient(ellipse at 50% 50%, ${
            isLight ? tokens.surface : "rgba(255,255,255,0.05)"
          } 0%, transparent 70%)`,
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
          gap: 36,
          padding: "0 64px",
        }}
      >
        <div
          style={{
            opacity: stampOpacity,
            transform: `scale(${stampScale})`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 28,
          }}
        >
          <BrandMark markInner={tokens.markInner} size={160} startFrame={0} rings={true} />
          <div
            style={{
              fontSize: 56,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: ink,
              textAlign: "center",
            }}
          >
            {tokens.businessName}
          </div>
        </div>

        {scene.cta ? (
          <div
            style={{
              fontSize: 28,
              fontWeight: 500,
              letterSpacing: "0.02em",
              color: accent,
              textAlign: "center",
              maxWidth: 880,
              padding: "16px 28px",
              border: `1.5px solid ${accent}`,
              borderRadius: 100,
              opacity: ctaOpacity,
              transform: `translateY(${interpolate(frame, [30, 50], [12, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })}px)`,
            }}
          >
            {scene.cta}
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
