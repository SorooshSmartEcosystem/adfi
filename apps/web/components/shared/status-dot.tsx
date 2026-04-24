type Tone = "alive" | "attn" | "urgent" | "neutral";

const TONE_BG: Record<Tone, string> = {
  alive: "bg-alive",
  attn: "bg-attentionBorder",
  urgent: "bg-urgent",
  neutral: "bg-ink5",
};

export function StatusDot({
  tone = "alive",
  size = 7,
  animated = false,
  className = "",
}: {
  tone?: Tone;
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  const shouldPulse = animated && (tone === "alive" || tone === "urgent");
  return (
    <span
      aria-hidden
      className={`inline-block rounded-full shrink-0 ${TONE_BG[tone]} ${shouldPulse ? "animate-pulse-dot" : ""} ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
