// QuoteReel — Mirrors the carousel-artboard "ink palette + accent"
// design language. Vertical 1080×1920 reel, ~9 seconds.
//
// Frame map (270 frames @ 30fps):
//   0.0s  ink backdrop fades up; corner labels (01/01 + QUOTE) appear
//   0.5s  accent dot pulses in top-left; mark fades into top-right
//   1.0s  quote words start fading up sequentially (~3.5s of staggered reveals)
//   5.0s  attribution mono line slides up
//   6.5s  brief hold
//   7.5s  inversion: quote slides up + out, brand block scales in for closer
//   9.0s  end on a brand-stamped end card
//
// Use case: opinion takes, value statements, observations the audience
// would screenshot.

import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { WordReveal } from "../primitives/WordReveal";
import { BrandMark } from "../primitives/BrandMark";
import type { BrandTokens, QuoteContent } from "../types";

type Props = { tokens: BrandTokens; content: QuoteContent };

export const QuoteReel: React.FC<Props> = ({ tokens, content }) => {
  const frame = useCurrentFrame();

  // Closer phase starts at 7.5s (frame 225). Quote slides out, brand
  // stamp grows in.
  const closerProgress = interpolate(frame, [220, 260], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Word reveal: spread across ~3.5s. Stagger picked so a typical
  // 25-word quote finishes around frame 130.
  const wordCount = content.quote.split(/\s+/).filter(Boolean).length;
  const stagger = Math.max(2, Math.min(6, Math.round(90 / Math.max(1, wordCount))));
  const lastWordFinishesAt = 30 + wordCount * stagger + 16;
  const attributionStart = lastWordFinishesAt + 8;

  return (
    <AbsoluteFill
      style={{
        background: tokens.ink,
        fontFamily:
          '-apple-system, "SF Pro Text", Inter, system-ui, sans-serif',
        color: "#FFFFFF",
        overflow: "hidden",
      }}
    >
      {/* Subtle radial vignette for depth — flat solid bg looks cheap. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0) 55%)`,
        }}
      />

      {/* CORNER METADATA — copies the carousel's HUD aesthetic. */}
      {/* Top-left: accent dot + slide counter */}
      <div
        style={{
          position: "absolute",
          top: 64,
          left: 64,
          display: "flex",
          alignItems: "center",
          gap: 14,
          opacity: interpolate(frame, [6, 22], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <PulseDot color={tokens.alive ?? "#7CE896"} />
        <span style={hudMonoStyle}>01 / 01</span>
      </div>

      {/* Top-right: template label */}
      <div
        style={{
          position: "absolute",
          top: 64,
          right: 64,
          opacity: interpolate(frame, [6, 22], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <span style={hudMonoStyle}>QUOTE</span>
      </div>

      {/* MAIN CONTENT — quote (active 0-7.5s) and brand stamp (closer). */}

      {/* Quote */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "0 96px",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          opacity: 1 - closerProgress,
          transform: `translateY(${closerProgress * -240}px)`,
        }}
      >
        {/* Big leading quote glyph — accent color, sets the stage. */}
        <div
          style={{
            fontSize: 240,
            lineHeight: 0.6,
            color: tokens.alive ?? "#7CE896",
            fontFamily: '"SF Pro Display", "Helvetica Neue", serif',
            fontWeight: 600,
            marginBottom: -40,
            opacity: interpolate(frame, [10, 28], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            }),
            transform: `translateY(${interpolate(
              frame,
              [10, 28],
              [12, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            )}px)`,
          }}
        >
          “
        </div>

        <div
          style={{
            fontSize: 76,
            fontWeight: 500,
            lineHeight: 1.15,
            letterSpacing: "-0.025em",
            color: "#FFFFFF",
            maxWidth: 880,
          }}
        >
          <WordReveal startFrame={30} staggerFrames={stagger} wordDurationFrames={20} travel={18}>
            {content.quote}
          </WordReveal>
        </div>

        {content.attribution ? (
          <div
            style={{
              marginTop: 56,
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              fontSize: 22,
              letterSpacing: "0.18em",
              color: "rgba(255,255,255,0.55)",
              textTransform: "uppercase",
              opacity: interpolate(
                frame,
                [attributionStart, attributionStart + 16],
                [0, 1],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.out(Easing.cubic),
                },
              ),
              transform: `translateY(${interpolate(
                frame,
                [attributionStart, attributionStart + 16],
                [14, 0],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              )}px)`,
            }}
          >
            — {content.attribution}
          </div>
        ) : null}
      </div>

      {/* CLOSER — brand stamp grows in as quote leaves. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          opacity: closerProgress,
          transform: `scale(${interpolate(
            closerProgress,
            [0, 1],
            [0.92, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          )})`,
        }}
      >
        <BrandMark
          markInner={tokens.markInner}
          size={140}
          startFrame={220}
          rings={true}
        />
        <div
          style={{
            fontSize: 44,
            fontWeight: 500,
            letterSpacing: "-0.015em",
            color: "#FFFFFF",
          }}
        >
          {tokens.businessName}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 8,
          }}
        >
          <PulseDot color={tokens.alive ?? "#7CE896"} />
          <span style={hudMonoStyle}>END</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const hudMonoStyle: React.CSSProperties = {
  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
  fontSize: 18,
  letterSpacing: "0.2em",
  color: "rgba(255,255,255,0.45)",
  textTransform: "uppercase",
};

function PulseDot({ color }: { color: string }) {
  const frame = useCurrentFrame();
  const scale = 1 + 0.25 * Math.sin(frame / 8);
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        transform: `scale(${scale})`,
        boxShadow: `0 0 12px ${color}66`,
      }}
    />
  );
}
