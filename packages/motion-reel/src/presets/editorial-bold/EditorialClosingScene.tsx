// EditorialClosingScene — closer for editorial-bold reels. The brand
// mark sits at the center, business name appears in heavy display
// type below, and an optional CTA pill sits at the bottom. Mirrors
// the opener's spotlight beam (now reversed — beam pulses inward).
//
// Reference: closing frames of Empire Labs reels with the brand
// motif as the focal point and a single CTA below.

"use client";

import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { Icon } from "../../primitives/Icon";
import { paceEasing, paceStaggerFrames } from "../../motion/pace";
import { fitText } from "../../motion/fitText";
import { isIconName } from "../../icons";
import type { BrandTokens, VideoDesign } from "../../types";
import type { EditorialClosingShape } from "../types";

export type { EditorialClosingShape };

type Props = {
  tokens: BrandTokens;
  scene: EditorialClosingShape;
  design: Required<VideoDesign>;
};

export const EditorialClosingScene: React.FC<Props> = ({
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

  const motifName = isIconName(scene.motif) ? scene.motif : "sparkle";

  // Mark scales in
  const markScale = interpolate(frame, [4, 4 + stagger * 1.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.4)),
  });

  // Business name fades up after mark
  const nameStart = 4 + stagger * 2;
  const nameOpacity = interpolate(
    frame,
    [nameStart, nameStart + stagger * 1.5],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const nameY = interpolate(
    frame,
    [nameStart, nameStart + stagger * 1.5],
    [16, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing,
    },
  );

  // CTA fades + scales after the name
  const ctaStart = nameStart + stagger * 1.5;
  const ctaOpacity = interpolate(
    frame,
    [ctaStart, ctaStart + stagger],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const businessName = tokens.businessName || "your brand";
  const nameFontSize = fitText({
    text: businessName,
    maxSize: 120,
    minSize: 48,
    advance: 0.52,
    maxLines: 2,
    containerWidth: 920,
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
          padding: "120px 80px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 56,
        }}
      >
        <div style={{ transform: `scale(${markScale})`, color: accent }}>
          <Icon name={motifName} size={180} strokeWidth={2.5} color={accent} />
        </div>

        <div
          style={{
            fontSize: nameFontSize,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1,
            color: ink,
            textAlign: "center",
            opacity: nameOpacity,
            transform: `translateY(${nameY}px)`,
          }}
        >
          {businessName}
        </div>

        {scene.cta ? (
          <div
            style={{
              opacity: ctaOpacity,
              padding: "18px 36px",
              borderRadius: 999,
              border: `2px solid ${ink}`,
              fontSize: 32,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: ink,
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
      return "#0F0F0F";
  }
}
