// QuoteScene — Pull-quote with optional emphasis word highlighted.
// Word-by-word fade-up reveal. Used for the rhetorical / argumentation
// beats inside a longer reel.

import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { WordReveal } from "../primitives/WordReveal";
import { fitText } from "../motion/fitText";
import type { BrandTokens, QuoteSceneShape, VideoDesign } from "../types";

type Props = {
  tokens: BrandTokens;
  scene: QuoteSceneShape;
  design: Required<VideoDesign>;
};

export const QuoteScene: React.FC<Props> = ({ tokens, scene, design }) => {
  const frame = useCurrentFrame();
  const isLight = design.style !== "bold";
  const bg = isLight ? tokens.bg : tokens.ink;
  const ink = isLight ? tokens.ink : "#FFFFFF";
  const accent = accentColor(design.accent, tokens);

  const words = scene.quote.split(/\s+/).filter(Boolean);
  const stagger = Math.max(2, Math.min(5, Math.round(50 / Math.max(1, words.length))));

  // Big leading quote glyph
  const glyphOpacity = interpolate(frame, [4, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const attributionStart = 14 + words.length * stagger + 14;

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
            isLight ? tokens.surface : "rgba(255,255,255,0.04)"
          } 0%, transparent 65%)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "0 80px",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            fontSize: 200,
            fontFamily: '"SF Pro Display", Georgia, serif',
            fontWeight: 600,
            color: accent,
            lineHeight: 0.6,
            opacity: glyphOpacity,
            marginBottom: -32,
          }}
        >
          “
        </div>

        <div
          style={{
            fontSize: fitText({
              text: scene.quote,
              maxSize: 72,
              minSize: 38,
              advance: 0.55,
              maxLines: 5,
            }),
            fontWeight: 500,
            lineHeight: 1.18,
            letterSpacing: "-0.025em",
            color: ink,
            maxWidth: 880,
          }}
        >
          <WordReveal startFrame={14} staggerFrames={stagger} wordDurationFrames={18} travel={16}>
            {emphasize(scene.quote, scene.emphasis ?? null, accent)}
          </WordReveal>
        </div>

        {scene.attribution ? (
          <div
            style={{
              marginTop: 40,
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              fontSize: 22,
              letterSpacing: "0.18em",
              color: isLight ? tokens.ink3 : "rgba(255,255,255,0.55)",
              textTransform: "uppercase",
              opacity: interpolate(frame, [attributionStart, attributionStart + 16], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.cubic),
              }),
            }}
          >
            — {scene.attribution}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

// We can't easily inject styled spans inside WordReveal because it
// splits on whitespace. So we accept the trade-off: emphasis isn't
// inline-styled inside the quote — it's just a hint for the agent
// to NOT use here. PunchlineScene is where the emphasis word actually
// gets visual weight.
function emphasize(text: string, _emphasis: string | null, _color: string): string {
  return text;
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
