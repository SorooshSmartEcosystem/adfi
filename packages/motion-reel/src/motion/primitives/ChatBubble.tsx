// ChatBubble — animated chat-message bubble. Slides in from a side
// (theirs from left, yours from right per messaging UX convention),
// with optional typing-indicator dots before the text appears, then
// the text typewriters in. Used for testimonial moments / customer
// quote scenes / conversational beats.

"use client";

import { Easing, interpolate, useCurrentFrame } from "remotion";
import { useMemo } from "react";

type Side = "them" | "you";

type Props = {
  text: string;
  side?: Side;
  // Show typing-indicator dots before the text. Default true.
  withTypingIndicator?: boolean;
  // Frame to start the slide-in. Default 0.
  startFrame?: number;
  // Bubble bg color. Default depends on side.
  bgColor?: string;
  // Text color. Default depends on side.
  textColor?: string;
  // Container max width. Default 480.
  maxWidth?: number;
  // Inline style overrides.
  containerStyle?: React.CSSProperties;
};

export const ChatBubble: React.FC<Props> = ({
  text,
  side = "them",
  withTypingIndicator = true,
  startFrame = 0,
  bgColor,
  textColor,
  maxWidth = 480,
  containerStyle,
}) => {
  const frame = useCurrentFrame();
  const elapsed = frame - startFrame;

  // Phase 1: bubble slides in (frames 0-12)
  const slideIn = interpolate(elapsed, [0, 12], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 2: typing indicator (frames 12-30 if enabled)
  const typingStart = 14;
  const typingEnd = withTypingIndicator ? 32 : 14;
  const typingActive =
    withTypingIndicator && elapsed >= typingStart && elapsed < typingEnd;

  // Phase 3: text typewriter (frames typingEnd onward)
  const textStart = typingEnd + 2;
  const charsPerFrame = 0.7;
  const charsToShow =
    elapsed > textStart
      ? Math.floor((elapsed - textStart) * charsPerFrame)
      : 0;
  const visibleText = text.slice(0, Math.min(charsToShow, text.length));

  const isThem = side === "them";
  const resolvedBg = bgColor ?? (isThem ? "#F0F0F0" : "#0F0F0F");
  const resolvedText = textColor ?? (isThem ? "#0F0F0F" : "#FFFFFF");

  const slideX = (1 - slideIn) * (isThem ? -40 : 40);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isThem ? "flex-start" : "flex-end",
        width: "100%",
        ...containerStyle,
      }}
    >
      <div
        style={{
          maxWidth,
          padding: "14px 20px",
          borderRadius: 22,
          background: resolvedBg,
          color: resolvedText,
          opacity: slideIn,
          transform: `translateX(${slideX}px)`,
          fontFamily: '"Inter", sans-serif',
          fontSize: 22,
          fontWeight: 500,
          lineHeight: 1.35,
          minHeight: 44,
          display: "flex",
          alignItems: "center",
        }}
      >
        {typingActive ? (
          <TypingDots color={resolvedText} />
        ) : (
          <span>{visibleText}</span>
        )}
      </div>
    </div>
  );
};

const TypingDots: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      {[0, 1, 2].map((i) => {
        const phase = ((frame + i * 6) % 30) / 30;
        const opacity = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: color,
              opacity: 0.3 + opacity * 0.6,
            }}
          />
        );
      })}
    </span>
  );
};
