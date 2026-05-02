// IconListScene — vertical list of 3-6 pillars, each with a small
// circle-iconed entry. Editorial-bold treatment: white background,
// black icons inside accent-colored circles, heavy black labels,
// subtle stagger reveal.
//
// Reference: Empire Labs reels' "Knowledge / Solution / Genuine Tips
// / Growth / Benefits" frame where each pillar is a circle icon +
// label, sometimes with one row highlighted by an accent panel
// behind the label.
//
// Visual rules (locked):
//   - Circle icon background uses the accent color
//   - Icon stroke is white inside the circle
//   - Highlighted row uses a soft accent fill behind the label
//   - One row max gets the highlight; agent picks via `highlightIndex`

"use client";

import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { Icon } from "../../primitives/Icon";
import { paceEasing, paceStaggerFrames } from "../../motion/pace";
import { fitText } from "../../motion/fitText";
import { isIconName, type IconName } from "../../icons";
import type { BrandTokens, VideoDesign } from "../../types";
import type { IconListShape } from "../types";

export type { IconListShape };

type Props = {
  tokens: BrandTokens;
  scene: IconListShape;
  design: Required<VideoDesign>;
};

export const IconListScene: React.FC<Props> = ({ tokens, scene, design }) => {
  const frame = useCurrentFrame();
  const easing = paceEasing(design.pace);
  const stagger = paceStaggerFrames(design.pace);
  const accent = accentColor(design.accent, tokens);

  const bg = "#FFFFFF";
  const ink = "#0F0F0F";
  const inkLight = "#5A5A5A";

  const items = scene.items.slice(0, 6);
  const titleOpacity = interpolate(frame, [4, 4 + stagger], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Pick label font size so even the longest label fits in one line.
  const longestLabel =
    items.reduce((m, it) => (it.label.length > m.length ? it.label : m), "") ||
    "label";
  const labelFontSize = fitText({
    text: longestLabel,
    maxSize: 56,
    minSize: 32,
    advance: 0.55,
    maxLines: 1,
    containerWidth: 720,
  });

  return (
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
          justifyContent: "center",
          gap: 40,
        }}
      >
        {scene.title ? (
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "0.18em",
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
            display: "flex",
            flexDirection: "column",
            gap: 28,
          }}
        >
          {items.map((item, i) => {
            const start = (scene.title ? stagger : 0) + 4 + i * stagger;
            const opacity = interpolate(
              frame,
              [start, start + stagger * 1.4],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );
            const tx = interpolate(
              frame,
              [start, start + stagger * 1.4],
              [-24, 0],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing,
              },
            );
            const isHighlight = scene.highlightIndex === i;
            const iconName: IconName = isIconName(item.icon)
              ? item.icon
              : "check";

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 28,
                  opacity,
                  transform: `translateX(${tx}px)`,
                  background: isHighlight
                    ? blend(accent, 0.12)
                    : "transparent",
                  borderRadius: 999,
                  padding: isHighlight ? "12px 24px 12px 12px" : "0",
                  marginLeft: isHighlight ? -12 : 0,
                  transition: "background 200ms",
                }}
              >
                <div
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: "50%",
                    background: accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: "#FFFFFF",
                  }}
                >
                  <Icon
                    name={iconName}
                    size={44}
                    strokeWidth={2}
                    color="#FFFFFF"
                  />
                </div>
                <div
                  style={{
                    fontSize: labelFontSize,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: ink,
                    lineHeight: 1.1,
                  }}
                >
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Lighten an accent color by mixing with white. Cheap version for the
// highlight panel — proper color mixing would need a color library
// but the visual difference is negligible at low alpha.
function blend(color: string, alpha: number): string {
  // Accept #RRGGBB. Fall back to a soft gray if format unexpected.
  const hex = color.startsWith("#") ? color.slice(1) : color;
  if (hex.length !== 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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
