// DataBarScene — animated horizontal bar chart for comparison data.
// 2-5 bars, each with a label and a value that count up while the
// bar grows from 0 to its target ratio. Used when the agent has
// concrete comparable numbers from the brief (e.g. "ETF inflows by
// asset" with 3-5 entries) — replaces a stat scene that would have
// crammed the data into one big number plus a confusing suffix.
//
// Visual contract:
//   - One thin row per bar: small mono label on the left, growing
//     bar in the middle, value on the right.
//   - Bar fill uses the accent color; track uses the surface token.
//   - Stagger between bars uses paceStaggerFrames so slow paces
//     reveal each row deliberately and fast paces snap them in.

import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { PCMonoLabel } from "../primitives/PCMonoLabel";
import { CounterNumber } from "../primitives/CounterNumber";
import { paceEasing, paceStaggerFrames } from "../motion/pace";
import { fitText } from "../motion/fitText";
import type { BrandTokens, DataBarSceneShape, VideoDesign } from "../types";

type Props = {
  tokens: BrandTokens;
  scene: DataBarSceneShape;
  design: Required<VideoDesign>;
};

export const DataBarScene: React.FC<Props> = ({ tokens, scene, design }) => {
  const frame = useCurrentFrame();
  const easing = paceEasing(design.pace);
  const stagger = paceStaggerFrames(design.pace);
  const isLight = design.style !== "bold";
  const bg = isLight ? tokens.bg : tokens.ink;
  const ink = isLight ? tokens.ink : "#FFFFFF";
  const ink3 = isLight ? tokens.ink3 : "rgba(255,255,255,0.55)";
  const surface = isLight ? tokens.surface : "rgba(255,255,255,0.08)";
  const accent = accentColor(design.accent, tokens);

  const bars = scene.bars.slice(0, 5);
  // Find the largest numeric value for scaling. Strings count as
  // their numeric prefix if parseable, else default to a sensible
  // fraction so the bar still renders.
  const numericValues = bars.map((b) => {
    if (typeof b.value === "number") return b.value;
    const parsed = parseFloat(String(b.value).replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 1;
  });
  const maxValue = Math.max(...numericValues, 1);

  const titleOpacity = interpolate(frame, [4, 4 + stagger], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const captionStart = 4 + stagger * (bars.length + 2);
  const captionOpacity = interpolate(
    frame,
    [captionStart, captionStart + stagger],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

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
          padding: "120px 80px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 36,
        }}
      >
        {scene.title ? (
          <div style={{ opacity: titleOpacity }}>
            <PCMonoLabel
              tone={design.accent}
              color={isLight ? undefined : "rgba(255,255,255,0.65)"}
            >
              {scene.title}
            </PCMonoLabel>
          </div>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {bars.map((bar, i) => {
            const start = 4 + stagger + i * stagger;
            const grow = interpolate(
              frame,
              [start, start + stagger * 2.5],
              [0, 1],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing,
              },
            );
            const ratio =
              typeof bar.value === "number"
                ? bar.value / maxValue
                : numericValues[i]! / maxValue;
            const fillRatio = Math.max(0.04, ratio); // floor so even
            // small bars are visible
            const isNumeric = typeof bar.value === "number";
            const labelFontSize = fitText({
              text: bar.label,
              maxSize: 32,
              minSize: 20,
              advance: 0.55,
              maxLines: 1,
              containerWidth: 280,
            });

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  opacity: interpolate(
                    frame,
                    [start, start + stagger],
                    [0, 1],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                  ),
                }}
              >
                <div
                  style={{
                    width: 280,
                    fontSize: labelFontSize,
                    fontWeight: 500,
                    color: ink3,
                    letterSpacing: "-0.01em",
                    textAlign: "left",
                  }}
                >
                  {bar.label}
                </div>

                <div
                  style={{
                    position: "relative",
                    flex: 1,
                    height: 8,
                    background: surface,
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: `${fillRatio * 100 * grow}%`,
                      background: accent,
                      borderRadius: 4,
                    }}
                  />
                </div>

                <div
                  style={{
                    width: 220,
                    fontSize: 44,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: ink,
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {bar.prefix ?? ""}
                  {isNumeric ? (
                    <CounterNumber
                      value={bar.value as number}
                      startFrame={start}
                      durationFrames={Math.round(stagger * 2.5)}
                      prefix=""
                      suffix=""
                    />
                  ) : (
                    String(bar.value)
                  )}
                  {bar.suffix ?? ""}
                </div>
              </div>
            );
          })}
        </div>

        {scene.caption ? (
          <div
            style={{
              fontSize: 28,
              fontWeight: 400,
              lineHeight: 1.4,
              color: ink3,
              maxWidth: 800,
              opacity: captionOpacity,
            }}
            dir="auto"
          >
            {scene.caption}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

function accentColor(
  accent: VideoDesign["accent"],
  tokens: BrandTokens,
): string {
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
