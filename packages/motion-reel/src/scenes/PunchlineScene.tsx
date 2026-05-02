// PunchlineScene — The line that lands. Single sentence, optional
// emphasis word swapped to accent color + heavier weight. Used as the
// closer beat before the brand stamp.

import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { fitText } from "../motion/fitText";
import type { BrandTokens, PunchlineScene as PunchlineShape, VideoDesign } from "../types";

type Props = {
  tokens: BrandTokens;
  scene: PunchlineShape;
  design: Required<VideoDesign>;
};

export const PunchlineScene: React.FC<Props> = ({ tokens, scene, design }) => {
  const frame = useCurrentFrame();
  const isLight = design.style !== "bold";
  const bg = isLight ? tokens.bg : tokens.ink;
  const ink = isLight ? tokens.ink : "#FFFFFF";
  const accent = accentColor(design.accent, tokens);

  // Whole line fades up + scales subtly. Simpler than word reveal —
  // matches the rhythmic "single beat" pacing the line implies.
  const opacity = interpolate(frame, [4, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const scale = interpolate(frame, [4, 28], [0.94, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Inline-emphasize the matching word(s) by rendering as JSX nodes.
  const parts = splitWithEmphasis(scene.line, scene.emphasis ?? null);

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
          background: `radial-gradient(ellipse at 50% 50%, ${
            isLight ? tokens.surface : "rgba(255,255,255,0.05)"
          } 0%, transparent 70%)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "0 80px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity,
          transform: `scale(${scale})`,
        }}
      >
        <div
          style={{
            fontSize: fitText({
              text: scene.line,
              maxSize: 96,
              minSize: 44,
              advance: 0.55,
              maxLines: 4,
            }),
            fontWeight: 600,
            lineHeight: 1.12,
            letterSpacing: "-0.03em",
            color: ink,
            maxWidth: 920,
            textAlign: "left",
            wordBreak: "break-word",
            overflowWrap: "anywhere",
          }}
        >
          {parts.map((p, i) =>
            p.emphasis ? (
              <span
                key={i}
                style={{
                  color: accent,
                  fontWeight: 700,
                }}
              >
                {p.text}
              </span>
            ) : (
              <span key={i}>{p.text}</span>
            ),
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

function splitWithEmphasis(
  text: string,
  emphasis: string | null,
): { text: string; emphasis: boolean }[] {
  if (!emphasis) return [{ text, emphasis: false }];
  const idx = text.toLowerCase().indexOf(emphasis.toLowerCase());
  if (idx < 0) return [{ text, emphasis: false }];
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + emphasis.length);
  const after = text.slice(idx + emphasis.length);
  return [
    { text: before, emphasis: false },
    { text: match, emphasis: true },
    { text: after, emphasis: false },
  ];
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
      return tokens.ink;
  }
}
