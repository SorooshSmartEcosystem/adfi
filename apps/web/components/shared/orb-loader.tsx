"use client";

// OrbLoader — the unified ADFI "I'm working" indicator.
//
// Three states share the same visual primitive:
//   working   — rotating dotted ring around the orb, status line cycles
//   rendering — same as working but with explicit progress 0-1 driving
//               an arc fill instead of a continuous ring
//   error     — orb pulses red, status line static
//
// Tones map to the active agent so users build a mental model:
//   echo (drafting)        → alive  (green)
//   signal (replies/dms)   → urgent (red)
//   strategist (voice)     → ink    (mono)
//   scout (rivals)         → attn   (amber)
//   pulse (trends)         → alive  (green)
//   generic / multi-agent  → ink    (mono)
//
// Sizes mirror existing usage:
//   sm   32px — inside textareas / inline buttons
//   md   64px — inside draft cards while regenerating
//   lg  160px — full-page modal during first-time generation / video render
//
// Status line cycles through stage labels at ~2.2s intervals. Real
// progress percentages are used when provided (Lambda framesRendered);
// otherwise the orb-loader fakes plausible stage progression so the UX
// always feels specific.

import { useEffect, useState } from "react";
import { Orb } from "./orb";

export type OrbTone = "alive" | "attn" | "urgent" | "ink";
type Size = "sm" | "md" | "lg";

const TONE_HEX: Record<OrbTone, string> = {
  alive: "#3a9d5c",
  attn: "#D9A21C",
  urgent: "#C84A3E",
  ink: "#111111",
};

const ORB_SIZES: Record<Size, "sm" | "md" | "xl"> = {
  sm: "sm",
  md: "md",
  lg: "xl",
};

const PIXEL_SIZES: Record<Size, number> = {
  sm: 32,
  md: 64,
  lg: 160,
};

export type OrbLoaderProps = {
  tone?: OrbTone;
  size?: Size;
  // Stage labels rotated through every ~2.2s. Pass per-action context
  // — e.g. ["WRITING IN YOUR VOICE", "TUNING HASHTAGS", ...]. The
  // loader handles the rotation. Omit for a generic "WORKING".
  stages?: string[];
  // 0..1 — when set, draws an arc filling clockwise around the orb
  // and shows a numeric percentage. Use for jobs with real progress
  // (Lambda renders). Omit for jobs where we don't have a number.
  progress?: number;
  // Optional override for the cycle interval (ms). Default 2200.
  stageIntervalMs?: number;
  // When true, the orb is in error state: red pulse, static line.
  error?: boolean;
};

export function OrbLoader({
  tone = "ink",
  size = "md",
  stages,
  progress,
  stageIntervalMs = 2200,
  error = false,
}: OrbLoaderProps) {
  const [stageIdx, setStageIdx] = useState(0);
  const px = PIXEL_SIZES[size];
  const accent = error ? TONE_HEX.urgent : TONE_HEX[tone];

  // Cycle stages.
  useEffect(() => {
    if (!stages || stages.length <= 1 || error) return;
    const id = setInterval(
      () => setStageIdx((i) => (i + 1) % stages.length),
      stageIntervalMs,
    );
    return () => clearInterval(id);
  }, [stages, stageIntervalMs, error]);

  const currentStage = error
    ? "I HIT A SNAG — TRY AGAIN"
    : stages?.[stageIdx] ?? "WORKING";

  // Ring/arc geometry — sized to wrap around the orb with breathing room.
  const ringSize = px + (size === "lg" ? 28 : size === "md" ? 16 : 8);
  const strokeWidth = size === "lg" ? 2 : 1.5;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const isProgress = typeof progress === "number";

  const dashOffset = isProgress
    ? circumference * (1 - Math.max(0, Math.min(1, progress)))
    : 0;

  return (
    <div className="flex flex-col items-center gap-md">
      <div
        className="relative flex items-center justify-center"
        style={{ width: ringSize, height: ringSize }}
      >
        {/* The orb itself */}
        <Orb size={ORB_SIZES[size]} ring={false} animated={!error} />

        {/* Animated ring/arc around the orb */}
        <svg
          className="absolute inset-0 -rotate-90"
          width={ringSize}
          height={ringSize}
          viewBox={`0 0 ${ringSize} ${ringSize}`}
          aria-hidden
        >
          {/* Track — faint */}
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            fill="none"
            stroke={accent}
            strokeOpacity={0.12}
            strokeWidth={strokeWidth}
          />
          {/* Progress / spinner arc */}
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            fill="none"
            stroke={accent}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={
              isProgress
                ? dashOffset
                : circumference * 0.78 /* spinner: short visible arc */
            }
            style={
              isProgress
                ? {
                    transition: "stroke-dashoffset 0.4s ease-out",
                  }
                : {
                    transformOrigin: "center",
                    animation: "orb-loader-spin 1.6s linear infinite",
                  }
            }
          />
        </svg>

        {/* Pulse halos for the working state — independent rings */}
        {!error ? (
          <>
            <span
              className="absolute rounded-full pointer-events-none"
              style={{
                inset: `-${size === "lg" ? 14 : size === "md" ? 8 : 4}px`,
                border: `0.5px solid ${accent}`,
                opacity: 0,
                animation: "orb-loader-pulse 2.6s ease-out infinite",
              }}
            />
            <span
              className="absolute rounded-full pointer-events-none"
              style={{
                inset: `-${size === "lg" ? 14 : size === "md" ? 8 : 4}px`,
                border: `0.5px solid ${accent}`,
                opacity: 0,
                animation: "orb-loader-pulse 2.6s ease-out infinite",
                animationDelay: "1.3s",
              }}
            />
          </>
        ) : null}

        {/* Progress percentage (lg + progress provided) */}
        {isProgress && size === "lg" ? (
          <div
            className="absolute font-mono text-xs tracking-[0.16em]"
            style={{ bottom: -28, color: accent }}
          >
            {Math.round((progress ?? 0) * 100)}%
          </div>
        ) : null}
      </div>

      {/* Status line */}
      <div
        className="font-mono text-[11px] tracking-[0.2em] uppercase"
        style={{
          color: error ? TONE_HEX.urgent : "#6A6A6A",
          minHeight: 16, // prevents layout shift between blank → text
        }}
        aria-live="polite"
      >
        {currentStage}
      </div>

      {/* Inline keyframes — co-located so this component is drop-in
          and we don't have to touch globals.css. */}
      <style jsx global>{`
        @keyframes orb-loader-spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes orb-loader-pulse {
          0% {
            transform: scale(1);
            opacity: 0.55;
          }
          100% {
            transform: scale(1.55);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// Stage label banks — per-action prebuilt cycles. Importable so
// callers don't have to re-write the same copy in every page.
// Keep them voice-consistent with the rest of ADFI: lowercase-feel
// even though display is uppercase, action verbs in present tense,
// no exclamation points.
// ============================================================

export const STAGES_DRAFT_POST = [
  "READING THE BRIEF",
  "WRITING IN YOUR VOICE",
  "PICKING THE BEST HOOK",
  "TUNING HASHTAGS",
  "CHECKING BRAND PILLARS",
  "ALMOST READY",
];

export const STAGES_VIDEO_SCRIPT = [
  "BREAKING DOWN THE POST",
  "PICKING SCENES",
  "WRITING THE HOOK",
  "FRAMING THE PUNCHLINE",
  "PICKING DESIGN KNOBS",
  "ALMOST READY",
];

export const STAGES_VIDEO_RENDER = [
  "ASKING THE LAMBDA TEAM",
  "BUNDLING SCENES",
  "RENDERING FRAMES",
  "ENCODING MP4",
  "UPLOADING",
];

export const STAGES_STRATEGIST = [
  "READING WHAT YOU TYPED",
  "STUDYING THE CATEGORY",
  "PICKING YOUR PILLARS",
  "DEFINING THE VOICE",
  "ALMOST READY",
];

export const STAGES_BRAND_KIT = [
  "PICKING A PALETTE",
  "DRAWING YOUR LOGO",
  "GENERATING COVERS",
  "TUNING TYPOGRAPHY",
  "ASSEMBLING KIT",
];

export const STAGES_SIGNAL = [
  "READING THE MESSAGE",
  "MATCHING YOUR TONE",
  "DRAFTING THE REPLY",
  "SENDING",
];

export const STAGES_SCOUT = [
  "CHECKING YOUR RIVALS",
  "RANKING WHAT MATTERS",
  "WRITING THE DIGEST",
];

export const STAGES_PULSE = [
  "SCANNING TRENDS",
  "FILTERING NOISE",
  "RANKING BY RELEVANCE",
];
