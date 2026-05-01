// StatScene — Single labeled metric with animated counter + accent
// underline. Smaller than HookScene; meant to slot into a sequence
// after the hook to back the claim with a number.

import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { PCMonoLabel } from "../primitives/PCMonoLabel";
import { CounterNumber } from "../primitives/CounterNumber";
import type { BrandTokens, StatSceneShape, VideoDesign } from "../types";

type Props = {
  tokens: BrandTokens;
  scene: StatSceneShape;
  design: Required<VideoDesign>;
};

export const StatScene: React.FC<Props> = ({ tokens, scene, design }) => {
  const frame = useCurrentFrame();
  const isLight = design.style !== "bold";
  const bg = isLight ? tokens.bg : tokens.ink;
  const ink = isLight ? tokens.ink : "#FFFFFF";
  const accent = accentColor(design.accent, tokens);

  const isNumeric = typeof scene.value === "number";
  const labelTy = interpolate(frame, [4, 18], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const numberScale = interpolate(frame, [10, 30], [0.85, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const underline = interpolate(frame, [32, 54], [0, 1], {
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
          background: `radial-gradient(ellipse at 50% 35%, ${
            isLight ? tokens.surface : "rgba(255,255,255,0.05)"
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
          gap: 32,
          padding: "0 64px",
        }}
      >
        <div style={{ transform: `translateY(${labelTy}px)`, opacity: interpolate(frame, [4, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          <PCMonoLabel tone={design.accent} color={isLight ? undefined : "rgba(255,255,255,0.6)"}>
            {scene.label}
          </PCMonoLabel>
        </div>

        <div
          style={{
            fontSize: 280,
            fontWeight: 700,
            letterSpacing: "-0.05em",
            lineHeight: 1,
            color: ink,
            transform: `scale(${numberScale})`,
            opacity: interpolate(frame, [10, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          {isNumeric ? (
            <CounterNumber
              value={scene.value as number}
              startFrame={10}
              durationFrames={36}
              prefix={scene.prefix ?? ""}
              suffix={scene.suffix ?? ""}
            />
          ) : (
            <>
              {scene.prefix ?? ""}
              {scene.value as string}
              {scene.suffix ?? ""}
            </>
          )}
        </div>

        <div
          style={{
            height: 4,
            width: 240,
            background: accent,
            transform: `scaleX(${underline})`,
            transformOrigin: "left center",
            borderRadius: 2,
          }}
        />
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
