// ChatThreadScene — fake messenger thread with 2-4 alternating
// bubbles. Each bubble shows a brief typing indicator, then types
// in. Used for testimonials, customer questions, conversational
// scenes ("here's what someone asked us").
//
// Visual structure:
//   - Phone-style frame (subtle — no full phone chrome, just rounded
//     corners on the chat container)
//   - Two participants: "you" (sender, accent-color bubbles, right-
//     aligned) and the other (gray bubbles, left-aligned)
//   - Optional title/header at the top of the chat

"use client";

import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { paceEasing, paceStaggerFrames } from "../../motion/pace";
import { getMoodConfig, adjustSaturation } from "../../motion/mood";
import { fitText } from "../../motion/fitText";
import type { BrandTokens, VideoDesign } from "../../types";
import type { ChatThreadShape } from "../types";

type Props = {
  tokens: BrandTokens;
  scene: ChatThreadShape;
  design: Required<VideoDesign>;
};

export const ChatThreadScene: React.FC<Props> = ({
  tokens,
  scene,
  design,
}) => {
  const frame = useCurrentFrame();
  const mood = getMoodConfig(design.mood);
  const stagger = Math.round(paceStaggerFrames(design.pace) * mood.paceFactor);
  const easing = paceEasing(design.pace);

  const rawAccent = accentColor(design.accent, tokens);
  const accent = adjustSaturation(rawAccent, mood.accentSaturation);
  const bg = mood.bgTint || tokens.bg || "#FFFFFF";
  const ink = tokens.ink || "#0F0F0F";
  const inkLight = tokens.ink3 || "#5A5A5A";
  const surface = tokens.surface || "#F0F0F0";

  const messages = scene.messages.slice(0, 4);
  const titleOpacity = interpolate(frame, [4, 4 + stagger], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Each message gets a typing-pause + reveal slot.
  const messageOffset = stagger * 4; // typing + reveal time per message
  const messageStart = (i: number) =>
    (scene.title ? stagger : 0) + 8 + i * messageOffset;

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
          padding: "140px 100px",
          display: "flex",
          flexDirection: "column",
          gap: 32,
        }}
      >
        {scene.title ? (
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: inkLight,
              opacity: titleOpacity,
              textAlign: "center",
            }}
          >
            {scene.title}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            justifyContent: "center",
            flex: 1,
          }}
        >
          {messages.map((msg, i) => {
            const start = messageStart(i);
            const typingEnd = start + stagger * 2;
            const bubbleStart = typingEnd;
            const bubbleEnd = bubbleStart + stagger * 1.5;

            const typingOpacity = interpolate(
              frame,
              [start, start + stagger * 0.5, typingEnd, typingEnd + 2],
              [0, 1, 1, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );
            const bubbleOpacity = interpolate(
              frame,
              [bubbleStart, bubbleEnd],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );
            const bubbleY = interpolate(
              frame,
              [bubbleStart, bubbleEnd],
              [16, 0],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.cubic),
              },
            );

            const isYou = msg.sender === "you";
            const align = isYou ? ("flex-end" as const) : ("flex-start" as const);
            const bubbleBg = isYou ? accent : surface;
            const bubbleColor = isYou ? "#FFFFFF" : ink;
            const bubbleFontSize = fitText({
              text: msg.text,
              maxSize: 36,
              minSize: 22,
              advance: 0.55,
              maxLines: 5,
              containerWidth: 660,
            });

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: align,
                  gap: 6,
                }}
              >
                {/* Typing indicator */}
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    padding: "12px 18px",
                    background: bubbleBg,
                    borderRadius: 22,
                    opacity: typingOpacity,
                    position: "absolute",
                  }}
                >
                  {[0, 1, 2].map((dot) => (
                    <div
                      key={dot}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: isYou ? "#FFFFFF" : inkLight,
                        opacity:
                          0.4 +
                          (Math.sin((frame + dot * 6) * 0.4) + 1) * 0.3,
                      }}
                    />
                  ))}
                </div>

                {/* Bubble */}
                <div
                  style={{
                    background: bubbleBg,
                    color: bubbleColor,
                    padding: "16px 22px",
                    borderRadius: 22,
                    maxWidth: 720,
                    fontSize: bubbleFontSize,
                    lineHeight: 1.3,
                    fontWeight: 500,
                    opacity: bubbleOpacity,
                    transform: `translateY(${bubbleY}px)`,
                    wordBreak: "break-word",
                  }}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}
        </div>
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
