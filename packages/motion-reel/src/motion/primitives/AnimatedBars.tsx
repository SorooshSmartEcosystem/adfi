// AnimatedBars — bar chart that grows from zero to its target
// values with stagger. Each bar can have its own label + value.
// Used for data scenes, "by-the-numbers" beats, comparison content.
//
// Two orientations:
//   - horizontal: bars grow left → right (stacked vertically)
//   - vertical:   bars grow bottom → top (stacked horizontally)

"use client";

import { Easing, interpolate, useCurrentFrame } from "remotion";

type Bar = {
  label: string;
  value: number;
  // Optional pre-formatted display string. If omitted, value
  // formatted as integer.
  display?: string;
  // Optional override color for this specific bar.
  color?: string;
};

type Props = {
  bars: Bar[];
  // Bar color (default for all bars unless they specify their own).
  color?: string;
  // Label color.
  labelColor?: string;
  // Track color (the empty bar bg). Default low-opacity.
  trackColor?: string;
  // Orientation. Default horizontal.
  orientation?: "horizontal" | "vertical";
  // Frames per bar — bars stagger in. Default 6.
  staggerFrames?: number;
  // Frames each bar takes to grow. Default 22.
  growFrames?: number;
  // Frame the first bar starts. Default 0.
  startFrame?: number;
  // Container max size in px (width for horizontal, height for vertical).
  size?: number;
  // Max value to scale against. Defaults to max bar value.
  maxValue?: number;
};

export const AnimatedBars: React.FC<Props> = ({
  bars,
  color = "currentColor",
  labelColor = "currentColor",
  trackColor = "rgba(0,0,0,0.08)",
  orientation = "horizontal",
  staggerFrames = 6,
  growFrames = 22,
  startFrame = 0,
  size = 600,
  maxValue,
}) => {
  const frame = useCurrentFrame();
  const max = maxValue ?? Math.max(...bars.map((b) => b.value), 1);

  if (orientation === "horizontal") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          width: size,
        }}
      >
        {bars.map((bar, i) => {
          const start = startFrame + i * staggerFrames;
          const t = interpolate(frame, [start, start + growFrames], [0, 1], {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const widthPct = (bar.value / max) * 100 * t;
          const valueDisplay =
            bar.display ?? Math.round(bar.value * t).toLocaleString();
          return (
            <div
              key={i}
              style={{ display: "flex", flexDirection: "column", gap: 6 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: "'SF Mono', monospace",
                  fontSize: 16,
                  fontWeight: 500,
                  color: labelColor,
                }}
              >
                <span>{bar.label}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {valueDisplay}
                </span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: 10,
                  background: trackColor,
                  position: "relative",
                  borderRadius: 1,
                }}
              >
                <div
                  style={{
                    width: `${widthPct}%`,
                    height: "100%",
                    background: bar.color ?? color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Vertical
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        height: size,
      }}
    >
      {bars.map((bar, i) => {
        const start = startFrame + i * staggerFrames;
        const t = interpolate(frame, [start, start + growFrames], [0, 1], {
          easing: Easing.out(Easing.cubic),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const heightPct = (bar.value / max) * 100 * t;
        const valueDisplay =
          bar.display ?? Math.round(bar.value * t).toLocaleString();
        return (
          <div
            key={i}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              height: "100%",
            }}
          >
            <div
              style={{
                fontFamily: '"SF Pro Display", sans-serif',
                fontWeight: 700,
                fontSize: 28,
                color: labelColor,
                fontVariantNumeric: "tabular-nums",
                opacity: t,
              }}
            >
              {valueDisplay}
            </div>
            <div
              style={{
                width: "100%",
                flex: 1,
                position: "relative",
                background: trackColor,
                display: "flex",
                alignItems: "flex-end",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: `${heightPct}%`,
                  background: bar.color ?? color,
                }}
              />
            </div>
            <div
              style={{
                fontFamily: "'SF Mono', monospace",
                fontSize: 14,
                fontWeight: 500,
                color: labelColor,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                opacity: t,
              }}
            >
              {bar.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};
