// HashtagScene — Tag cloud reveal for the closing seconds. Each tag
// slides up with its own stagger, accent-colored.

import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import type { BrandTokens, HashtagScene as HashtagShape, VideoDesign } from "../types";

type Props = {
  tokens: BrandTokens;
  scene: HashtagShape;
  design: Required<VideoDesign>;
};

export const HashtagScene: React.FC<Props> = ({ tokens, scene, design }) => {
  const frame = useCurrentFrame();
  const isLight = design.style !== "bold";
  const bg = isLight ? tokens.bg : tokens.ink;
  const ink = isLight ? tokens.ink : "#FFFFFF";
  const accent = accentColor(design.accent, tokens);

  const captionIn = interpolate(frame, [4, 22], [0, 1], {
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
          padding: "0 80px",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: 56,
        }}
      >
        {scene.caption ? (
          <div
            style={{
              fontSize: 48,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              color: ink,
              maxWidth: 880,
              opacity: captionIn,
              transform: `translateY(${interpolate(frame, [4, 22], [12, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })}px)`,
            }}
          >
            {scene.caption}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            maxWidth: 920,
          }}
        >
          {scene.hashtags.slice(0, 8).map((raw, i) => {
            const tag = raw.startsWith("#") ? raw : `#${raw}`;
            const start = 24 + i * 6;
            const opacity = interpolate(frame, [start, start + 14], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            });
            const ty = interpolate(frame, [start, start + 14], [14, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            });
            return (
              <div
                key={i}
                style={{
                  fontSize: 32,
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                  color: accent,
                  padding: "12px 22px",
                  border: `1.5px solid ${accent}`,
                  borderRadius: 100,
                  opacity,
                  transform: `translateY(${ty}px)`,
                }}
              >
                {tag}
              </div>
            );
          })}
        </div>
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
