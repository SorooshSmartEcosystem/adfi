// StatReel — Same design language as QuoteReel: ink palette + accent
// dot, corner HUD labels, display typography. Vertical 1080×1920.
//
// Frame map (240 frames @ 30fps, 8 seconds):
//   0.0s  ink backdrop fades up; HUD labels (01/01 + STAT) appear
//   0.4s  pulsing accent dot top-left; mark fades into top-right
//   0.8s  uppercase mono label slides up
//   1.4s  big number scales + counts up; subtle accent underline draws in
//   3.0s  context line word-reveals beneath the number
//   5.5s  hold
//   7.0s  closer — number compresses up, brand stamp grows in
//   8.0s  end card

import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { WordReveal } from "../primitives/WordReveal";
import { CounterNumber } from "../primitives/CounterNumber";
import { BrandMark } from "../primitives/BrandMark";
import type { BrandTokens, StatContent } from "../types";

type Props = { tokens: BrandTokens; content: StatContent };

function parseValue(v: number | string): {
  isNumeric: boolean;
  numeric: number;
  rawString: string;
} {
  if (typeof v === "number")
    return { isNumeric: true, numeric: v, rawString: String(v) };
  return { isNumeric: false, numeric: 0, rawString: v };
}

export const StatReel: React.FC<Props> = ({ tokens, content }) => {
  const frame = useCurrentFrame();
  const { isNumeric, numeric, rawString } = parseValue(content.value);

  const closerProgress = interpolate(frame, [200, 230], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Underline draw — subtle line below the big number, drawn left to right.
  const underline = interpolate(frame, [70, 92], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

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
      {/* Vignette for depth */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.07) 0%, rgba(0,0,0,0) 60%)`,
        }}
      />

      {/* Top-left HUD */}
      <div
        style={{
          position: "absolute",
          top: 64,
          left: 64,
          display: "flex",
          alignItems: "center",
          gap: 14,
          opacity: interpolate(frame, [4, 18], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <PulseDot color={tokens.alive ?? "#7CE896"} />
        <span style={hudMonoStyle}>01 / 01</span>
      </div>

      {/* Top-right HUD */}
      <div
        style={{
          position: "absolute",
          top: 64,
          right: 64,
          opacity: interpolate(frame, [4, 18], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <span style={hudMonoStyle}>STAT</span>
      </div>

      {/* MAIN — label + big number + context */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "0 96px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          opacity: 1 - closerProgress,
          transform: `translateY(${closerProgress * -160}px)`,
        }}
      >
        {/* Mono label */}
        <div
          style={{
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            fontSize: 26,
            letterSpacing: "0.22em",
            color: tokens.alive ?? "#7CE896",
            textTransform: "uppercase",
            opacity: interpolate(frame, [16, 36], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            }),
            transform: `translateY(${interpolate(
              frame,
              [16, 36],
              [12, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            )}px)`,
          }}
        >
          {content.label}
        </div>

        {/* Big number */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {isNumeric ? (
            <div
              style={{
                fontSize: 280,
                fontWeight: 600,
                letterSpacing: "-0.05em",
                lineHeight: 1,
                color: "#FFFFFF",
                opacity: interpolate(frame, [42, 60], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.out(Easing.cubic),
                }),
                transform: `scale(${interpolate(
                  frame,
                  [42, 70],
                  [0.85, 1],
                  {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: Easing.out(Easing.cubic),
                  },
                )})`,
              }}
            >
              <CounterNumber
                value={numeric}
                startFrame={48}
                durationFrames={42}
                prefix={content.prefix ?? ""}
                suffix={content.suffix ?? ""}
              />
            </div>
          ) : (
            <div
              style={{
                fontSize: 280,
                fontWeight: 600,
                letterSpacing: "-0.05em",
                lineHeight: 1,
                color: "#FFFFFF",
                opacity: interpolate(frame, [42, 60], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.out(Easing.cubic),
                }),
                transform: `scale(${interpolate(
                  frame,
                  [42, 70],
                  [0.85, 1],
                  {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: Easing.out(Easing.cubic),
                  },
                )})`,
              }}
            >
              {content.prefix ?? ""}
              {rawString}
              {content.suffix ?? ""}
            </div>
          )}

          {/* Accent underline draws in left-to-right */}
          <div
            style={{
              marginTop: 16,
              height: 4,
              width: 320,
              background: tokens.alive ?? "#7CE896",
              transform: `scaleX(${underline})`,
              transformOrigin: "left center",
              borderRadius: 2,
            }}
          />
        </div>

        {/* Context — word reveal */}
        <div
          style={{
            marginTop: 28,
            fontSize: 36,
            fontWeight: 400,
            lineHeight: 1.3,
            letterSpacing: "-0.01em",
            color: "rgba(255,255,255,0.78)",
            textAlign: "center",
            maxWidth: 820,
          }}
        >
          <WordReveal
            startFrame={108}
            staggerFrames={3}
            wordDurationFrames={14}
            travel={10}
          >
            {content.context}
          </WordReveal>
        </div>
      </div>

      {/* CLOSER — brand stamp grows in */}
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
          startFrame={200}
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
