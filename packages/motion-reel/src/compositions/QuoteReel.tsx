// QuoteReel — single quote, types in line by line over a textured
// brand backdrop. Closing card with mark + business name.
//
// 9-second composition (270 frames @ 30fps):
//   0.0s  brand mark fades in top-center, business name underneath
//   1.0s  quote types in (3-4 lines, ~2.5s of typing)
//   3.5s  attribution fades up (if present)
//   4.0s  hold the full quote
//   7.5s  quote fades out, mark slides to center, gets pulse rings
//   9.0s  end
//
// Use case: inspirational posts, value statements, one-liner takes.

import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { TypewriterText } from "../primitives/TypewriterText";
import { FadeCard } from "../primitives/FadeCard";
import { BrandMark } from "../primitives/BrandMark";
import type { BrandTokens, QuoteContent } from "../types";

type Props = { tokens: BrandTokens; content: QuoteContent };

export const QuoteReel: React.FC<Props> = ({ tokens, content }) => {
  const frame = useCurrentFrame();

  // Quote typing budget: 75 frames (2.5s) regardless of length.
  // Short quotes type quickly; long quotes type more characters per
  // frame. Either feels right for short-form video pacing.
  const typingDuration = 75;

  // Closing transition: at frame 225 (7.5s), the upper section starts
  // fading out and the mark slides toward center.
  const exitProgress = interpolate(frame, [225, 270], [0, 1], {
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
      {/* Backdrop: a soft brand-tinted radial behind the quote. Pure
          CSS, deterministic. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 35%, ${tokens.surface} 0%, ${tokens.bg} 65%)`,
        }}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          padding: "120px 96px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
        }}
      >
        {/* Top: mark + business name. Slides toward center on exit. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
            transform: `translateY(${exitProgress * 360}px)`,
            transition: "transform 0.2s",
          }}
        >
          <BrandMark
            markInner={tokens.markInner}
            size={88}
            startFrame={0}
            rings={exitProgress > 0.3}
          />
          <div
            style={{
              fontSize: 26,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              color: tokens.ink,
              opacity: interpolate(frame, [10, 25], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            {tokens.businessName}
          </div>
        </div>

        {/* Quote */}
        <div
          style={{
            marginTop: 96,
            opacity: 1 - exitProgress,
            transition: "opacity 0.2s",
          }}
        >
          <FadeCard startFrame={28} durationFrames={20} travel={20}>
            <div
              style={{
                fontSize: 64,
                fontWeight: 500,
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
                color: tokens.ink,
                textAlign: "center",
                maxWidth: 880,
              }}
            >
              <span style={{ color: tokens.ink4 }}>“</span>
              <TypewriterText startFrame={36} durationFrames={typingDuration}>
                {content.quote}
              </TypewriterText>
              <span style={{ color: tokens.ink4 }}>”</span>
            </div>
          </FadeCard>

          {content.attribution ? (
            <FadeCard startFrame={36 + typingDuration + 6} durationFrames={16} travel={14}>
              <div
                style={{
                  marginTop: 36,
                  textAlign: "center",
                  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                  fontSize: 22,
                  letterSpacing: "0.06em",
                  color: tokens.ink3,
                }}
              >
                {content.attribution}
              </div>
            </FadeCard>
          ) : null}
        </div>
      </div>
    </AbsoluteFill>
  );
};
