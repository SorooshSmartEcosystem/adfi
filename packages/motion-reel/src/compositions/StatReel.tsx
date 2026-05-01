// StatReel — Direct port of the landing-page strategist scene
// aesthetic. Cream background, KPI block at top with staggered scale-in,
// context card beneath, brand stamp closer. Same card-stack vocabulary
// as QuoteReel.
//
// Vertical 1080×1920, 8 seconds (240 frames @ 30fps):
//   0.0s  cream backdrop, status bar fades in (e.g. "WEEKLY REVIEW")
//   0.4s  KPI mega-card scales in with the big number + label
//   2.5s  context card fades up beneath
//   5.5s  closer card with brand stamp
//   8.0s  end

import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { PCCard } from "../primitives/PCCard";
import { PCMonoLabel } from "../primitives/PCMonoLabel";
import { StatusBar } from "../primitives/StatusBar";
import { BrandMark } from "../primitives/BrandMark";
import { CounterNumber } from "../primitives/CounterNumber";
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

  const outro = interpolate(frame, [225, 240], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Big number scale-in
  const bigNumScale = interpolate(frame, [16, 36], [0.86, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill
      style={{
        background: tokens.bg,
        fontFamily:
          '-apple-system, "SF Pro Text", Inter, system-ui, sans-serif',
        color: tokens.ink,
        overflow: "hidden",
        opacity: outro,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 35%, ${tokens.surface} 0%, ${tokens.bg} 70%)`,
        }}
      />

      {/* Status bar */}
      <div style={{ position: "absolute", top: 56, left: 0, right: 0 }}>
        <StatusBar
          label="STRATEGIST · WEEKLY"
          time={statusTime()}
          startFrame={0}
        />
      </div>

      {/* CARD STACK */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "180px 0 160px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
        }}
      >
        {/* BIG NUMBER CARD — equivalent to landing's pc-kpi block */}
        <PCCard startFrame={12} variant="default">
          <PCMonoLabel tone="alive" style={{ marginBottom: 28 }}>
            {content.label}
          </PCMonoLabel>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "center",
              transform: `scale(${bigNumScale})`,
              transformOrigin: "center",
            }}
          >
            {isNumeric ? (
              <div
                style={{
                  fontSize: 220,
                  fontWeight: 600,
                  letterSpacing: "-0.05em",
                  lineHeight: 1,
                  color: tokens.ink,
                }}
              >
                <CounterNumber
                  value={numeric}
                  startFrame={20}
                  durationFrames={42}
                  prefix={content.prefix ?? ""}
                  suffix={content.suffix ?? ""}
                />
              </div>
            ) : (
              <div
                style={{
                  fontSize: 220,
                  fontWeight: 600,
                  letterSpacing: "-0.05em",
                  lineHeight: 1,
                  color: tokens.ink,
                }}
              >
                {content.prefix ?? ""}
                {rawString}
                {content.suffix ?? ""}
              </div>
            )}
          </div>
          {/* Accent underline */}
          <div
            style={{
              marginTop: 32,
              height: 4,
              width: 240,
              marginInline: "auto",
              background: tokens.alive ?? "#7CE896",
              transform: `scaleX(${interpolate(
                frame,
                [70, 92],
                [0, 1],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.out(Easing.cubic),
                },
              )})`,
              transformOrigin: "left center",
              borderRadius: 2,
            }}
          />
        </PCCard>

        {/* CONTEXT CARD */}
        <PCCard startFrame={70} variant="default" width={880}>
          <PCMonoLabel tone="ink" style={{ marginBottom: 14 }}>
            THIS WEEK'S STORY
          </PCMonoLabel>
          <div
            style={{
              fontSize: 32,
              lineHeight: 1.4,
              color: tokens.ink2,
              fontWeight: 400,
            }}
          >
            {content.context}
          </div>
        </PCCard>

        {/* CLOSER — brand stamp dark card */}
        <PCCard startFrame={140} variant="dark" width={880}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <BrandMark
              markInner={tokens.markInner}
              size={64}
              startFrame={140}
              rings={false}
            />
            <div style={{ flex: 1 }}>
              <PCMonoLabel
                tone="alive"
                color="rgba(255,255,255,0.75)"
                style={{ marginBottom: 6 }}
              >
                YOUR WEEK
              </PCMonoLabel>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 500,
                  letterSpacing: "-0.015em",
                  color: "#FFFFFF",
                }}
              >
                {tokens.businessName}
              </div>
            </div>
          </div>
        </PCCard>
      </div>
    </AbsoluteFill>
  );
};

function statusTime(): string {
  return "SUN 6PM";
}
