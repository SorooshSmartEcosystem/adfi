// QuoteReel — Direct port of the landing-page meet-the-team scene
// aesthetic. Cream background, rounded white cards stacking with
// staggered fade-up, mono labels with colored dots, soft shadows.
//
// Vertical 1080×1920, 9 seconds (270 frames @ 30fps):
//   0.0s  cream backdrop, status bar fades in ("ECHO · DRAFTED")
//   0.4s  card 1 — "WROTE IN YOUR VOICE" mono label + the quote
//   2.5s  card 2 — attribution as a subtle mono caption
//   4.5s  card 3 — "PUBLISHED" mono + business name + brand mark
//   8.0s  hold, soft outro fade
//   9.0s  end
//
// Use case: opinion takes, value statements, observations.

import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { PCCard } from "../primitives/PCCard";
import { PCMonoLabel } from "../primitives/PCMonoLabel";
import { StatusBar } from "../primitives/StatusBar";
import { BrandMark } from "../primitives/BrandMark";
import type { BrandTokens, QuoteContent, VideoDesign } from "../types";

type Props = {
  tokens: BrandTokens;
  content: QuoteContent;
  design?: VideoDesign;
};

export const QuoteReel: React.FC<Props> = ({ tokens, content, design }) => {
  const frame = useCurrentFrame();
  const d = resolveDesign(design);

  // Outro fade in last 0.5s
  const outro = interpolate(frame, [255, 270], [1, 0], {
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
        overflow: "hidden",
        opacity: outro,
      }}
    >
      {/* Faint cream wash to give depth (matches landing's surface tone) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 35%, ${tokens.surface} 0%, ${tokens.bg} 70%)`,
        }}
      />

      {/* Status bar pinned to top */}
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 0,
          right: 0,
        }}
      >
        <StatusBar label={d.statusLabel} time={statusTime()} startFrame={0} />
      </div>

      {/* CARD STACK — vertically centered, gap-aligned */}
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
        {/* CARD 1 — the quote */}
        <PCCard
          startFrame={12}
          variant={d.style === "bold" ? "dark" : "default"}
        >
          <PCMonoLabel tone={d.accent} style={{ marginBottom: 24 }}>
            {d.hookLabel}
          </PCMonoLabel>
          <div
            style={{
              fontSize: 56,
              fontWeight: 500,
              lineHeight: 1.18,
              letterSpacing: "-0.025em",
              color: tokens.ink,
            }}
          >
            <span style={{ color: tokens.ink4 }}>“</span>
            {content.quote}
            <span style={{ color: tokens.ink4 }}>”</span>
          </div>
          {content.attribution ? (
            <div
              style={{
                marginTop: 28,
                fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                fontSize: 20,
                letterSpacing: "0.16em",
                color: tokens.ink3,
                textTransform: "uppercase",
              }}
            >
              — {content.attribution}
            </div>
          ) : null}
        </PCCard>

        {/* CARD 2 — meta context */}
        <PCCard
          startFrame={d.style === "bold" ? 56 : 68}
          variant={d.style === "warm" ? "amber" : "default"}
          width={880}
        >
          <PCMonoLabel tone="ink" style={{ marginBottom: 14 }}>
            {d.metaLabel}
          </PCMonoLabel>
          <div
            style={{
              fontSize: 28,
              lineHeight: 1.45,
              color: tokens.ink2,
              fontWeight: 400,
            }}
          >
            i'll publish this when your audience is most active.
          </div>
        </PCCard>

        {/* CARD 3 — brand stamp / closer */}
        <PCCard startFrame={d.style === "bold" ? 110 : 130} variant="dark" width={880}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
            }}
          >
            <BrandMark
              markInner={tokens.markInner}
              size={64}
              startFrame={d.style === "bold" ? 110 : 130}
              rings={false}
            />
            <div style={{ flex: 1 }}>
              <PCMonoLabel
                tone={d.accent}
                color="rgba(255,255,255,0.75)"
                style={{ marginBottom: 6 }}
              >
                {d.closerLabel}
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

// Deterministic "current time" string so the same composition always
// renders the same status bar. Picks 11:02AM — a believable mid-morning
// moment matching when small-business owners might check their drafts.
function statusTime(): string {
  return "11:02AM";
}

// Fill in defaults for any missing design knob. The agent should
// always provide all fields, but old drafts persisted before the
// design knob landed need sane fallbacks.
function resolveDesign(d?: VideoDesign): Required<VideoDesign> {
  return {
    style: d?.style ?? "minimal",
    accent: d?.accent ?? "alive",
    pace: d?.pace ?? "medium",
    statusLabel: d?.statusLabel ?? "ECHO · DRAFTED",
    hookLabel: d?.hookLabel ?? "WROTE IN YOUR VOICE",
    metaLabel: d?.metaLabel ?? "POST PREVIEW · INSTAGRAM",
    closerLabel: d?.closerLabel ?? "PUBLISHED",
  };
}
