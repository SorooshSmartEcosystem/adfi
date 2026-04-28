// StatReel — a big number counts up while a label sits above and a
// context line sits below. Closing card with mark + business name.
//
// 8-second composition (240 frames @ 30fps):
//   0.0s  brand mark fades in top-center, business name beneath
//   0.8s  label types in (uppercase mono, e.g. "THIS WEEK")
//   1.4s  big number starts counting up
//   2.4s  number settles
//   2.6s  context line types in
//   5.5s  hold full state
//   8.0s  end
//
// Use case: weekly stats, milestones, product specs.

import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { TypewriterText } from "../primitives/TypewriterText";
import { CounterNumber } from "../primitives/CounterNumber";
import { FadeCard } from "../primitives/FadeCard";
import { BrandMark } from "../primitives/BrandMark";
import type { BrandTokens, StatContent } from "../types";

type Props = { tokens: BrandTokens; content: StatContent };

// Parse a string-or-number value. Strings like "$4.2k" / "98%" we
// keep as static (the LLM/Echo decided the format); pure numbers we
// animate as a counter from 0.
function parseValue(v: number | string): { isNumeric: boolean; numeric: number; rawString: string } {
  if (typeof v === "number") return { isNumeric: true, numeric: v, rawString: String(v) };
  return { isNumeric: false, numeric: 0, rawString: v };
}

export const StatReel: React.FC<Props> = ({ tokens, content }) => {
  const frame = useCurrentFrame();
  const { isNumeric, numeric, rawString } = parseValue(content.value);

  // Label fade-in
  const labelOpacity = interpolate(frame, [24, 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Static value reveal (when value is a string, scale-in instead of count)
  const valueOpacity = interpolate(frame, [42, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const valueScale = interpolate(frame, [42, 60], [0.92, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: tokens.bg,
        fontFamily:
          '-apple-system, "SF Pro Text", Inter, system-ui, sans-serif',
        color: tokens.ink,
      }}
    >
      {/* Soft tint backdrop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 50%, ${tokens.surface} 0%, ${tokens.bg} 70%)`,
        }}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          padding: "140px 96px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Top: mark + business name */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <BrandMark markInner={tokens.markInner} size={72} startFrame={0} />
          <div
            style={{
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              color: tokens.ink,
              opacity: interpolate(frame, [8, 22], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            {tokens.businessName}
          </div>
        </div>

        {/* Mid: label + huge number */}
        <div
          style={{
            marginTop: 96,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
            flex: 1,
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              fontSize: 26,
              letterSpacing: "0.12em",
              color: tokens.ink4,
              opacity: labelOpacity,
            }}
          >
            <TypewriterText startFrame={24} durationFrames={14}>
              {content.label}
            </TypewriterText>
          </div>

          {isNumeric ? (
            <div
              style={{
                fontSize: 220,
                fontWeight: 500,
                letterSpacing: "-0.04em",
                lineHeight: 1,
                color: tokens.ink,
                opacity: interpolate(frame, [42, 56], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            >
              <CounterNumber
                value={numeric}
                startFrame={42}
                durationFrames={36}
                prefix={content.prefix ?? ""}
                suffix={content.suffix ?? ""}
              />
            </div>
          ) : (
            <div
              style={{
                fontSize: 220,
                fontWeight: 500,
                letterSpacing: "-0.04em",
                lineHeight: 1,
                color: tokens.ink,
                opacity: valueOpacity,
                transform: `scale(${valueScale})`,
              }}
            >
              {content.prefix ?? ""}
              {rawString}
              {content.suffix ?? ""}
            </div>
          )}
        </div>

        {/* Bottom: context */}
        <FadeCard startFrame={84} durationFrames={20} travel={18}>
          <div
            style={{
              fontSize: 32,
              lineHeight: 1.4,
              color: tokens.ink2,
              textAlign: "center",
              maxWidth: 820,
              fontWeight: 400,
            }}
          >
            <TypewriterText startFrame={92} durationFrames={56}>
              {content.context}
            </TypewriterText>
          </div>
        </FadeCard>
      </div>
    </AbsoluteFill>
  );
};
