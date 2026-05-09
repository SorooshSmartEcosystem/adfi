// MetricTileGridScene — 2×2 or 3-row grid of KPI tiles. Each tile
// has a label, a big animated value (counts up if numeric), and an
// optional delta. The "dashboard" feel — for stat-driven posts where
// a single big number wouldn't tell the whole story.
//
// Visual structure:
//   - Title at top (uppercase mono)
//   - Grid of 2-4 tiles, each in a soft surface card
//   - Tiles fade + scale in with stagger
//   - Values count up; positive deltas in accent color, negative in
//     urgent-red

"use client";

import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { CounterNumber } from "../../primitives/CounterNumber";
import { paceEasing, paceStaggerFrames } from "../../motion/pace";
import { getMoodConfig, adjustSaturation } from "../../motion/mood";
import { fitText } from "../../motion/fitText";
import { brandSignature } from "../../motion/brandSignature";
import {
  CameraMove,
  GridPattern,
  ParticleField,
  composeMotion,
} from "../../motion/primitives";
import type { BrandTokens, VideoDesign } from "../../types";
import type { MetricTileGridShape } from "../types";

type Props = {
  tokens: BrandTokens;
  scene: MetricTileGridShape;
  design: Required<VideoDesign>;
  sceneIndex?: number;
};

export const MetricTileGridScene: React.FC<Props> = ({
  tokens,
  scene,
  design,
  sceneIndex = 0,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const mood = getMoodConfig(design.mood);

  const sig = brandSignature(tokens.businessName);
  const recipe = composeMotion({
    brandSeed: sig.seed,
    sceneIndex,
    sceneType: "bold-statement",
    mood: design.mood,
  });

  const stagger = Math.round(paceStaggerFrames(design.pace) * mood.paceFactor);
  const easing = paceEasing(design.pace);

  const rawAccent = accentColor(design.accent, tokens);
  const accent = adjustSaturation(rawAccent, mood.accentSaturation);
  const bg = mood.bgTint || tokens.bg || "#FFFFFF";
  const ink = tokens.ink || "#0F0F0F";
  const inkLight = tokens.ink3 || "#5A5A5A";
  const surface = tokens.surface || "#F4F4F4";

  const tiles = scene.tiles.slice(0, 4);
  const cols = tiles.length <= 2 ? 1 : 2;

  const titleOpacity = interpolate(frame, [4, 4 + stagger], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
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
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "140px 80px",
          display: "flex",
          flexDirection: "column",
          gap: 56,
        }}
      >
        {scene.title ? (
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: inkLight,
              opacity: titleOpacity,
            }}
          >
            {scene.title}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: cols === 1 ? "1fr" : "1fr 1fr",
            gap: 32,
            flex: 1,
          }}
        >
          {tiles.map((tile, i) => {
            const start = (scene.title ? stagger : 0) + 4 + i * stagger;
            const opacity = interpolate(
              frame,
              [start, start + stagger * 1.5],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );
            const scale = interpolate(
              frame,
              [start, start + stagger * 1.5],
              [0.92, 1],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing,
              },
            );
            const isNumeric = typeof tile.value === "number";
            const valueFontSize = fitText({
              text:
                String(tile.value) +
                (tile.prefix ?? "") +
                (tile.suffix ?? ""),
              maxSize: 120,
              minSize: 56,
              advance: 0.55,
              maxLines: 1,
              containerWidth: 380,
            });

            const deltaPositive =
              typeof tile.delta === "string" && tile.delta.trim().startsWith("+");
            const deltaNegative =
              typeof tile.delta === "string" && tile.delta.trim().startsWith("-");
            const deltaColor = deltaPositive
              ? accent
              : deltaNegative
                ? "#C84A3E"
                : inkLight;

            return (
              <div
                key={i}
                style={{
                  background: surface,
                  borderRadius: 24,
                  padding: 32,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 16,
                  opacity,
                  transform: `scale(${scale})`,
                }}
              >
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: inkLight,
                  }}
                >
                  {tile.label}
                </div>
                <div
                  style={{
                    fontSize: valueFontSize,
                    fontWeight: mood.displayWeight,
                    letterSpacing: "-0.03em",
                    color: ink,
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1,
                  }}
                >
                  {tile.prefix ?? ""}
                  {isNumeric ? (
                    <CounterNumber
                      value={tile.value as number}
                      startFrame={start + stagger}
                      durationFrames={Math.round(stagger * 2.5)}
                      prefix=""
                      suffix=""
                    />
                  ) : (
                    String(tile.value)
                  )}
                  {tile.suffix ?? ""}
                </div>
                {tile.delta ? (
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: deltaColor,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {tile.delta}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );

  // Compose: metric tiles love a grid backdrop (engineering aesthetic)
  // and benefit from a subtle camera move to keep the dashboard
  // feeling alive instead of static.
  const cameraStyle = recipe.cameraStyle ?? "none";
  const gridBackdrop = recipe.gridBackdrop ?? "none";
  const particleFlavor = recipe.particleFlavor ?? "none";

  const composed = (
    <AbsoluteFill style={{ background: bg }}>
      {gridBackdrop !== "none" ? (
        <GridPattern
          flavor={gridBackdrop === "drift" ? "drift" : "static-fade"}
          color={`${ink}22`}
          opacity={0.18}
        />
      ) : null}
      {particleFlavor !== "none" ? (
        <ParticleField
          flavor={particleFlavor}
          seed={recipe.seed}
          opacity={0.2}
        />
      ) : null}
      <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>{inner}</div>
    </AbsoluteFill>
  );

  return cameraStyle !== "none" ? (
    <CameraMove
      style={cameraStyle}
      totalFrames={durationInFrames}
      intensity={mood.paceFactor * 0.6}
    >
      {composed}
    </CameraMove>
  ) : (
    composed
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
      return "#0F0F0F";
  }
}
