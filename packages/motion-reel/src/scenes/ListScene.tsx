// ListScene — Title + 2-4 numbered items. Each item slides up in
// sequence with its own stagger. The "3 things you should know" reel.

import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { PCMonoLabel } from "../primitives/PCMonoLabel";
import type { BrandTokens, ListSceneShape, VideoDesign } from "../types";

type Props = {
  tokens: BrandTokens;
  scene: ListSceneShape;
  design: Required<VideoDesign>;
};

export const ListScene: React.FC<Props> = ({ tokens, scene, design }) => {
  const frame = useCurrentFrame();
  const isLight = design.style !== "bold";
  const bg = isLight ? tokens.bg : tokens.ink;
  const ink = isLight ? tokens.ink : "#FFFFFF";
  const muted = isLight ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.55)";
  const accent = accentColor(design.accent, tokens);

  const titleIn = interpolate(frame, [4, 22], [0, 1], {
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
          gap: 48,
        }}
      >
        <div
          style={{
            opacity: titleIn,
            transform: `translateY(${interpolate(frame, [4, 22], [10, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}px)`,
          }}
        >
          <PCMonoLabel tone={design.accent} color={isLight ? undefined : "rgba(255,255,255,0.5)"}>
            {design.hookLabel}
          </PCMonoLabel>
          <div
            style={{
              fontSize: 64,
              fontWeight: 600,
              lineHeight: 1.12,
              letterSpacing: "-0.025em",
              color: ink,
              marginTop: 14,
              maxWidth: 880,
            }}
          >
            {scene.title}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 36, width: "100%", maxWidth: 880 }}>
          {scene.items.map((item, i) => {
            const start = 28 + i * 14;
            const opacity = interpolate(frame, [start, start + 16], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            });
            const ty = interpolate(frame, [start, start + 16], [16, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            });
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 28,
                  alignItems: "flex-start",
                  opacity,
                  transform: `translateY(${ty}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                    fontSize: 40,
                    fontWeight: 500,
                    color: accent,
                    minWidth: 64,
                    flexShrink: 0,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 44,
                      fontWeight: 500,
                      lineHeight: 1.15,
                      letterSpacing: "-0.02em",
                      color: ink,
                    }}
                  >
                    {item.headline}
                  </div>
                  {item.body ? (
                    <div
                      style={{
                        fontSize: 26,
                        lineHeight: 1.45,
                        color: muted,
                        marginTop: 10,
                        fontWeight: 400,
                      }}
                    >
                      {item.body}
                    </div>
                  ) : null}
                </div>
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
