// NumberedDiagramScene — concept diagram with 2-3 numbered callouts
// pointing at a center concept. Used for explainers where the brief
// has a structured argument: "two things matter — content + ads",
// "three forces work against you", etc.
//
// Reference: Empire Labs reels' "ad platforms" diagram with a center
// label and numbered leader lines pointing to two flanking concepts
// (1 → Content / 2 → ads).
//
// Composition:
//   - Center: a small accent-color square or diamond shape with
//     primary concept label
//   - 2-3 numbered callouts arranged around it, with thin leader
//     lines drawn on with stroke-dashoffset animation
//   - Numbers count up; lines draw in sequentially

"use client";

import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { paceEasing, paceStaggerFrames } from "../../motion/pace";
import { fitText } from "../../motion/fitText";
import type { BrandTokens, VideoDesign } from "../../types";
import type { NumberedDiagramShape } from "../types";

export type { NumberedDiagramShape };

type Props = {
  tokens: BrandTokens;
  scene: NumberedDiagramShape;
  design: Required<VideoDesign>;
};

export const NumberedDiagramScene: React.FC<Props> = ({
  tokens,
  scene,
  design,
}) => {
  const frame = useCurrentFrame();
  const easing = paceEasing(design.pace);
  const stagger = paceStaggerFrames(design.pace);
  const accent = accentColor(design.accent, tokens);

  const bg = "#FFFFFF";
  const ink = "#0F0F0F";
  const inkLight = "#5A5A5A";

  const callouts = scene.callouts.slice(0, 3);
  const titleOpacity = interpolate(frame, [4, 4 + stagger], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Diamond size + center label sizing
  const diamondSize = 320;
  const centerFontSize = fitText({
    text: scene.center,
    maxSize: 44,
    minSize: 24,
    advance: 0.55,
    maxLines: 2,
    containerWidth: diamondSize - 60,
  });

  // Diamond animation — scales in from the center
  const centerStart = scene.title ? 4 + stagger : 4;
  const centerScale = interpolate(
    frame,
    [centerStart, centerStart + stagger * 1.5],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing,
    },
  );

  // Callout positions — anchor points around the diamond.
  // Diagram is centered in a 600×600 box; positions are offsets from
  // the diamond's center to the callout label's start anchor.
  type Position = {
    labelX: number; // px from frame center
    labelY: number;
    side: "left" | "right";
  };
  const positions: Position[] = [
    { labelX: 360, labelY: -200, side: "right" },
    { labelX: 360, labelY: 60, side: "right" },
    { labelX: -360, labelY: 60, side: "left" },
  ];

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
          padding: "120px 60px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 60,
        }}
      >
        {scene.title ? (
          <div
            style={{
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: ink,
              opacity: titleOpacity,
              textAlign: "center",
            }}
          >
            {scene.title}
          </div>
        ) : null}

        <div
          style={{
            position: "relative",
            width: 1080,
            height: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Center diamond */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: diamondSize,
              height: diamondSize,
              transform: `translate(-50%, -50%) rotate(45deg) scale(${centerScale})`,
              background: accent,
              borderRadius: 28,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: `translate(-50%, -50%) scale(${centerScale})`,
              fontSize: centerFontSize,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#FFFFFF",
              textAlign: "center",
              maxWidth: diamondSize - 60,
              wordBreak: "break-word",
            }}
          >
            {scene.center}
          </div>

          {/* Numbered callouts with leader lines */}
          {callouts.map((c, i) => {
            const pos = positions[i] ?? positions[0]!;
            const start = centerStart + stagger * 1.5 + i * stagger;
            const opacity = interpolate(
              frame,
              [start, start + stagger * 1.5],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );
            const lineProgress = interpolate(
              frame,
              [start, start + stagger * 1.8],
              [0, 1],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.cubic),
              },
            );

            // Leader line — draws from diamond edge toward the
            // label. We approximate with a div whose width animates.
            const lineLength = Math.abs(pos.labelX) - 180; // 180 ≈ diamond half-width
            const lineX =
              pos.side === "right"
                ? `calc(50% + 180px)`
                : `calc(50% - 180px - ${lineLength}px)`;

            const labelFontSize = fitText({
              text: c.label,
              maxSize: 44,
              minSize: 24,
              advance: 0.55,
              maxLines: 2,
              containerWidth: 320,
            });

            return (
              <div key={i} style={{ opacity }}>
                {/* Leader line */}
                <div
                  style={{
                    position: "absolute",
                    top: `calc(50% + ${pos.labelY + 20}px)`,
                    left: lineX,
                    width: lineLength * lineProgress,
                    height: 2,
                    background: ink,
                    transformOrigin: pos.side === "right" ? "left center" : "right center",
                    transform: pos.side === "left"
                      ? `translateX(${lineLength * (1 - lineProgress)}px)`
                      : "none",
                  }}
                />
                {/* Number tag at the diamond end */}
                <div
                  style={{
                    position: "absolute",
                    top: `calc(50% + ${pos.labelY + 20 - 12}px)`,
                    left:
                      pos.side === "right"
                        ? `calc(50% + 180px - 28px)`
                        : `calc(50% - 180px - 4px)`,
                    width: 28,
                    height: 28,
                    borderRadius: 4,
                    background: ink,
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  {i + 1}
                </div>
                {/* Label at the end of the line */}
                <div
                  style={{
                    position: "absolute",
                    top: `calc(50% + ${pos.labelY}px)`,
                    left:
                      pos.side === "right"
                        ? `calc(50% + ${pos.labelX}px)`
                        : `calc(50% + ${pos.labelX - 320}px)`,
                    width: 320,
                    fontSize: labelFontSize,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: ink,
                    lineHeight: 1.1,
                    textAlign: pos.side === "right" ? "left" : "right",
                  }}
                >
                  {c.label}
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
      return "#0F0F0F";
  }
}
