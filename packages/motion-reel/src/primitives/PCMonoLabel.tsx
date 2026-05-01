// PCMonoLabel — uppercase mono caption with a colored dot prefix.
// Direct port of `pc-mono` from the landing-page meet-the-team scenes.
// Used as the small header above card titles ("WROTE IN YOUR VOICE",
// "INCOMING CALL", "WEEKLY · ALL CAMPAIGNS", etc.).

import type { CSSProperties } from "react";

export type PCDotTone = "alive" | "attn" | "urgent" | "ink";

type Props = {
  tone: PCDotTone;
  children: string;
  // Override the default mono color (#888 on light, #888 on dark).
  // Caller usually leaves this alone — variant is encoded in the card
  // background, not the label.
  color?: string;
  style?: CSSProperties;
};

const TONE_COLORS: Record<PCDotTone, string> = {
  alive: "#3a9d5c",
  attn: "#D9A21C",
  urgent: "#C84A3E",
  ink: "#111111",
};

export function PCMonoLabel({ tone, children, color, style }: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontFamily: '"SF Mono", "JetBrains Mono", monospace',
        fontSize: 18,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: color ?? "rgba(102,102,102,0.95)",
        ...style,
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: TONE_COLORS[tone],
          flexShrink: 0,
          boxShadow: `0 0 10px ${TONE_COLORS[tone]}55`,
        }}
      />
      <span>{children}</span>
    </div>
  );
}
