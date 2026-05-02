// TerminalScene — black-background terminal with monospace text
// typing in line by line. The "we shipped this" / "look at the
// code" aesthetic — dev / SaaS / crypto / finance brands.
//
// Visual structure:
//   - Full-frame black background (terminal style)
//   - Terminal header bar with traffic lights + window title
//   - Lines type in sequentially with a blinking cursor on the
//     current line
//   - Prompt char ("$" or ">") prefixes each command line
//   - Output lines have no prefix, slight indent, accent or muted
//     color for differentiation

"use client";

import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { paceStaggerFrames } from "../../motion/pace";
import { getMoodConfig, adjustSaturation } from "../../motion/mood";
import type { BrandTokens, VideoDesign } from "../../types";
import type { TerminalShape } from "../types";

type Props = {
  tokens: BrandTokens;
  scene: TerminalShape;
  design: Required<VideoDesign>;
};

export const TerminalScene: React.FC<Props> = ({
  tokens,
  scene,
  design,
}) => {
  const frame = useCurrentFrame();
  const mood = getMoodConfig(design.mood);
  const stagger = Math.round(paceStaggerFrames(design.pace) * mood.paceFactor);

  const rawAccent = accentColor(design.accent, tokens);
  const accent = adjustSaturation(rawAccent, mood.accentSaturation);

  // Terminal palette is fixed regardless of BrandKit — the
  // "terminal" aesthetic IS its colors. Accent provides the only
  // brand-bound element.
  const termBg = "#0B0F14";
  const termBg2 = "#161B22";
  const termInk = "#E6EDF3";
  const termInkLight = "#7B8898";

  const lines = scene.lines.slice(0, 8);
  const promptChar = scene.prompt ?? "$";
  const title = scene.title ?? "terminal";

  // Header animation
  const headerOpacity = interpolate(frame, [4, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Each line types in character-by-character. Time per line scales
  // with line length so longer lines don't fly by.
  let cursor = stagger * 1.5;
  const lineSchedule = lines.map((line) => {
    const charsPerSec = 30; // baseline typing speed
    const lineFrames = Math.max(
      Math.ceil((line.text.length / charsPerSec) * 30),
      8,
    );
    const start = cursor;
    cursor += lineFrames + stagger * 0.5;
    return { start, end: start + lineFrames };
  });

  return (
    <AbsoluteFill style={{ background: termBg, color: termInk }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "120px 60px",
          display: "flex",
          flexDirection: "column",
          gap: 0,
          fontFamily:
            '"JetBrains Mono", "SF Mono", "Menlo", "Monaco", monospace',
        }}
      >
        {/* Terminal window */}
        <div
          style={{
            background: termBg2,
            borderRadius: 16,
            border: `1px solid rgba(255,255,255,0.08)`,
            overflow: "hidden",
            opacity: headerOpacity,
            display: "flex",
            flexDirection: "column",
            flex: 1,
          }}
        >
          {/* Title bar */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: `1px solid rgba(255,255,255,0.06)`,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "#FF5F56",
              }}
            />
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "#FFBD2E",
              }}
            />
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "#27C93F",
              }}
            />
            <div
              style={{
                marginLeft: "auto",
                marginRight: "auto",
                fontSize: 22,
                color: termInkLight,
                fontWeight: 500,
              }}
            >
              {title}
            </div>
            <div style={{ width: 50 }} />
          </div>

          {/* Lines */}
          <div
            style={{
              flex: 1,
              padding: 36,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              fontSize: 30,
              lineHeight: 1.5,
            }}
          >
            {lines.map((line, i) => {
              const sched = lineSchedule[i]!;
              if (frame < sched.start) return null;

              // Per-character reveal
              const elapsed = frame - sched.start;
              const total = sched.end - sched.start;
              const progress = Math.min(1, elapsed / total);
              const charsToShow = Math.ceil(progress * line.text.length);
              const visible = line.text.slice(0, charsToShow);
              const isComplete = charsToShow >= line.text.length;
              const isOutput = line.kind === "output";
              const isError = line.kind === "error";

              const lineColor = isError
                ? "#FF6B6B"
                : isOutput
                  ? termInkLight
                  : termInk;

              const isCurrentlyTyping = i === currentTypingIndex(frame, lineSchedule);

              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 12,
                    color: lineColor,
                  }}
                >
                  {!isOutput && !isError ? (
                    <span style={{ color: accent, fontWeight: 600 }}>
                      {promptChar}
                    </span>
                  ) : (
                    <span style={{ width: "1ch" }} />
                  )}
                  <span style={{ wordBreak: "break-all" }}>
                    {visible}
                    {isCurrentlyTyping ? (
                      <span
                        style={{
                          opacity:
                            (Math.sin(frame * 0.3) + 1) / 2 > 0.5 ? 1 : 0,
                          color: accent,
                          marginLeft: 2,
                        }}
                      >
                        ▊
                      </span>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

function currentTypingIndex(
  frame: number,
  schedule: Array<{ start: number; end: number }>,
): number {
  for (let i = 0; i < schedule.length; i++) {
    const { start, end } = schedule[i]!;
    if (frame >= start && frame < end) return i;
  }
  return -1;
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
      return "#86E08C"; // terminal-green default for ink
  }
}
