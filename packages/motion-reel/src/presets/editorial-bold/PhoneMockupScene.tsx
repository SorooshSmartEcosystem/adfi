// PhoneMockupScene — vertical phone frame with animated content
// inside. Three "kinds" cover the most common use cases:
//   - "message"      — a single chat message bubble types in over time
//   - "notification" — a phone notification banner drops in from the
//                      top of the lock screen
//   - "feed"         — three small post tiles scroll up the screen
//
// This is the "we know what we're doing" scene. Real motion reels
// show phones constantly — anything happening in-product, customer
// communications, or social proof. Without it our output reads as
// "slide deck"; with it the video starts feeling like a real story.

"use client";

import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { paceEasing, paceStaggerFrames } from "../../motion/pace";
import { getMoodConfig, adjustSaturation } from "../../motion/mood";
import { fitText } from "../../motion/fitText";
import type { BrandTokens, VideoDesign } from "../../types";
import type { PhoneMockupShape } from "../types";

type Props = {
  tokens: BrandTokens;
  scene: PhoneMockupShape;
  design: Required<VideoDesign>;
};

export const PhoneMockupScene: React.FC<Props> = ({
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

  // Phone frame dimensions inside the 1080×1920 frame
  const phoneW = 540;
  const phoneH = 1100;
  const phoneRadius = 56;
  const screenInset = 18;
  const screenW = phoneW - screenInset * 2;
  const screenH = phoneH - screenInset * 2;

  // Phone scales in from below
  const phoneScale = interpolate(frame, [4, 24], [0.85, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.2)),
  });
  const phoneOpacity = interpolate(frame, [4, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Caption above the phone fades up first
  const captionStart = 0;
  const captionOpacity = interpolate(
    frame,
    [captionStart, captionStart + stagger],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        background: bg,
        color: ink,
        fontFamily:
          '"SF Pro Display", "Inter", -apple-system, sans-serif',
      }}
    >
      {scene.caption ? (
        <div
          style={{
            position: "absolute",
            top: 140,
            left: 80,
            right: 80,
            textAlign: "center",
            fontSize: fitText({
              text: scene.caption,
              maxSize: 56,
              minSize: 32,
              advance: 0.55,
              maxLines: 2,
            }),
            fontWeight: mood.displayWeight,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            color: ink,
            opacity: captionOpacity,
          }}
        >
          {scene.caption}
        </div>
      ) : null}

      {/* Phone frame */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 80,
          width: phoneW,
          height: phoneH,
          transform: `translateX(-50%) scale(${phoneScale})`,
          transformOrigin: "center bottom",
          opacity: phoneOpacity,
          background: ink,
          borderRadius: phoneRadius,
          padding: screenInset,
          boxShadow: `0 24px 48px rgba(0,0,0,0.18)`,
        }}
      >
        {/* Screen */}
        <div
          style={{
            position: "relative",
            width: screenW,
            height: screenH,
            background: scene.kind === "message" ? "#F4F4F4" : "#FFFFFF",
            borderRadius: phoneRadius - screenInset,
            overflow: "hidden",
          }}
        >
          {/* Notch */}
          <div
            style={{
              position: "absolute",
              top: 18,
              left: "50%",
              transform: "translateX(-50%)",
              width: 130,
              height: 30,
              background: ink,
              borderRadius: 16,
              zIndex: 10,
            }}
          />

          {/* Loose-string kind: "message" / "notification" / "feed".
               Anything else falls through to "message" (the most
               universally useful default) so an agent typo doesn't
               break the render. */}
          {scene.kind === "notification" ? (
            <NotificationScreen
              accent={accent}
              ink={ink}
              inkLight={inkLight}
              title={scene.author ?? "App"}
              body={scene.body}
              frame={frame}
              stagger={stagger}
            />
          ) : scene.kind === "feed" ? (
            <FeedScreen
              accent={accent}
              ink={ink}
              inkLight={inkLight}
              items={[scene.body]}
              frame={frame}
              stagger={stagger}
            />
          ) : (
            <MessageScreen
              accent={accent}
              ink={ink}
              inkLight={inkLight}
              text={scene.body}
              author={scene.author ?? "you"}
              startFrame={20}
              stagger={stagger}
              frame={frame}
            />
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const MessageScreen: React.FC<{
  accent: string;
  ink: string;
  inkLight: string;
  text: string;
  author: string;
  startFrame: number;
  stagger: number;
  frame: number;
}> = ({ accent, ink, inkLight, text, author, startFrame, stagger, frame }) => {
  // Typing indicator first, then bubble fades in
  const typingOpacity = interpolate(
    frame,
    [startFrame, startFrame + stagger, startFrame + stagger * 3],
    [0, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const bubbleStart = startFrame + stagger * 3;
  const bubbleOpacity = interpolate(
    frame,
    [bubbleStart, bubbleStart + stagger],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const bubbleY = interpolate(
    frame,
    [bubbleStart, bubbleStart + stagger * 1.2],
    [16, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    },
  );

  return (
    <>
      {/* Top bar with author */}
      <div
        style={{
          position: "absolute",
          top: 70,
          left: 0,
          right: 0,
          padding: "16px 24px",
          fontSize: 22,
          fontWeight: 600,
          color: ink,
          textAlign: "center",
          borderBottom: `1px solid rgba(0,0,0,0.08)`,
        }}
      >
        {author}
      </div>

      {/* Typing indicator */}
      <div
        style={{
          position: "absolute",
          bottom: 130,
          left: 24,
          background: "#E8E8E8",
          padding: "16px 22px",
          borderRadius: 22,
          opacity: typingOpacity,
          display: "flex",
          gap: 6,
        }}
      >
        {[0, 1, 2].map((i) => {
          const dotOp = (Math.sin((frame + i * 6) * 0.4) + 1) / 2;
          return (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: inkLight,
                opacity: 0.4 + dotOp * 0.6,
              }}
            />
          );
        })}
      </div>

      {/* Message bubble */}
      <div
        style={{
          position: "absolute",
          bottom: 120,
          left: 24,
          right: 100,
          padding: "16px 22px",
          background: accent,
          color: "#FFFFFF",
          borderRadius: 22,
          fontSize: 26,
          lineHeight: 1.3,
          fontWeight: 500,
          opacity: bubbleOpacity,
          transform: `translateY(${bubbleY}px)`,
        }}
      >
        {text}
      </div>
    </>
  );
};

const NotificationScreen: React.FC<{
  accent: string;
  ink: string;
  inkLight: string;
  title: string;
  body: string;
  frame: number;
  stagger: number;
}> = ({ accent, ink, inkLight, title, body, frame, stagger }) => {
  // Notification drops from top
  const dropY = interpolate(frame, [22, 42], [-200, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.1)),
  });
  const opacity = interpolate(frame, [22, 36], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <>
      {/* Lock-screen time + date placeholder */}
      <div
        style={{
          position: "absolute",
          top: 130,
          left: 0,
          right: 0,
          textAlign: "center",
          color: ink,
          fontSize: 80,
          fontWeight: 300,
          letterSpacing: "-0.03em",
        }}
      >
        9:41
      </div>
      <div
        style={{
          position: "absolute",
          top: 220,
          left: 0,
          right: 0,
          textAlign: "center",
          color: inkLight,
          fontSize: 24,
          fontWeight: 500,
        }}
      >
        Today
      </div>

      {/* Notification banner */}
      <div
        style={{
          position: "absolute",
          top: 320,
          left: 18,
          right: 18,
          background: "rgba(245,245,245,0.95)",
          borderRadius: 20,
          padding: "16px 18px",
          opacity,
          transform: `translateY(${dropY}px)`,
          backdropFilter: "blur(20px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 6,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: accent,
            }}
          />
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: ink,
              flex: 1,
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 16, color: inkLight }}>now</div>
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 500,
            color: ink,
            lineHeight: 1.3,
          }}
        >
          {body}
        </div>
      </div>
    </>
  );
};

const FeedScreen: React.FC<{
  accent: string;
  ink: string;
  inkLight: string;
  items: string[];
  frame: number;
  stagger: number;
}> = ({ accent, ink, inkLight, items, frame, stagger }) => {
  // Single item — slide up + fade in
  const itemOpacity = interpolate(frame, [22, 22 + stagger * 2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const itemY = interpolate(frame, [22, 22 + stagger * 2], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 140,
        left: 18,
        right: 18,
        bottom: 60,
        opacity: itemOpacity,
        transform: `translateY(${itemY}px)`,
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          border: `1px solid rgba(0,0,0,0.06)`,
          borderRadius: 18,
          padding: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: accent,
            }}
          />
          <div style={{ fontSize: 20, fontWeight: 600, color: ink }}>
            you
          </div>
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 500,
            color: ink,
            lineHeight: 1.3,
          }}
        >
          {items[0]}
        </div>
      </div>
    </div>
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
