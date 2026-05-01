// ContrastScene — Two-up A vs B comparison. Left side typically the
// "good" or focal stat, right side the comparison. Used for stat
// contrasts like "51% profitable" vs "20% profitable solo".

import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { PCMonoLabel } from "../primitives/PCMonoLabel";
import type { BrandTokens, ContrastScene as ContrastSceneShape, VideoDesign } from "../types";

type Props = {
  tokens: BrandTokens;
  scene: ContrastSceneShape;
  design: Required<VideoDesign>;
};

export const ContrastScene: React.FC<Props> = ({ tokens, scene, design }) => {
  const frame = useCurrentFrame();
  const isLight = design.style !== "bold";
  const bg = isLight ? tokens.bg : tokens.ink;
  const ink = isLight ? tokens.ink : "#FFFFFF";
  const muted = isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)";
  const accent = accentColor(design.accent, tokens);

  const leftIn = interpolate(frame, [4, 22], [-60, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const rightIn = interpolate(frame, [14, 32], [60, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const captionIn = interpolate(frame, [40, 58], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
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
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 64px",
          gap: 48,
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            maxWidth: 920,
            alignItems: "stretch",
            gap: 24,
          }}
        >
          {/* Left side */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 16,
              opacity: interpolate(frame, [4, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              transform: `translateX(${leftIn}px)`,
            }}
          >
            <PCMonoLabel tone={design.accent} color={isLight ? undefined : "rgba(255,255,255,0.55)"}>
              {scene.leftLabel}
            </PCMonoLabel>
            <div
              style={{
                fontSize: 200,
                fontWeight: 700,
                letterSpacing: "-0.05em",
                lineHeight: 0.95,
                color: accent,
              }}
            >
              {scene.leftValue}
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              width: 1,
              background: muted,
              opacity: interpolate(frame, [12, 24], [0, 0.3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}
          />

          {/* Right side */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 16,
              opacity: interpolate(frame, [14, 32], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              transform: `translateX(${rightIn}px)`,
            }}
          >
            <PCMonoLabel tone="ink" color={muted}>
              {scene.rightLabel}
            </PCMonoLabel>
            <div
              style={{
                fontSize: 200,
                fontWeight: 600,
                letterSpacing: "-0.05em",
                lineHeight: 0.95,
                color: muted,
              }}
            >
              {scene.rightValue}
            </div>
          </div>
        </div>

        {scene.caption ? (
          <div
            style={{
              fontSize: 32,
              fontWeight: 400,
              lineHeight: 1.4,
              letterSpacing: "-0.01em",
              color: ink,
              maxWidth: 880,
              textAlign: "center",
              opacity: captionIn,
              transform: `translateY(${interpolate(frame, [40, 58], [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
            }}
          >
            {scene.caption}
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
