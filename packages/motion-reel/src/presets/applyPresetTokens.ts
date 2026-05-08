// Preset-aware token resolver. The renderer always reads BrandTokens
// to color scenes; presets that change the visual world (dark mode,
// dark luxury, warm craft) override the relevant token slots HERE
// instead of forking 5 scene components per preset.
//
// Used at:
//  - Lambda render route, after loadBrandTokens() returns the BrandKit
//    palette. Wraps tokens with the preset override before passing
//    inputProps to renderMediaOnLambda.
//  - Browser preview (script-preview.tsx), same wrap before passing
//    to <Player>.
//
// The script's `preset` field drives the override. If preset is
// missing or unknown, returns brandTokens unchanged — every existing
// reel rendered without a preset (or with editorial-bold) still
// looks the same.

import type { BrandTokens } from "../types";
import type { PresetName } from "./types";

// Dark-mode token bundle for dashboard-tech. Hand-tuned to keep
// contrast ratios above 7:1 on the dark surface so type stays
// readable, and to give the accent enough headroom to glow.
const DASHBOARD_TECH_TOKENS: Partial<BrandTokens> = {
  bg: "#0A0E14",
  surface: "#11161E",
  surface2: "#1A222D",
  border: "#2A3440",
  ink: "#E8EDF3",
  ink2: "#B8C2CC",
  ink3: "#7A8694",
  ink4: "#4A5664",
  // Bright cyan-green — terminal aesthetic, signals "growth" / "good"
  // on a dashboard. Replaces editorial-bold's natural BrandKit alive.
  alive: "#00D4A4",
  aliveDark: "#009A78",
  // Warm amber for attention/urgency — pops on slate.
  attnBg: "#3A2A12",
  attnBorder: "#5A4220",
  attnText: "#FFB454",
};

export function applyPresetTokens(
  brandTokens: BrandTokens,
  presetName?: PresetName | string | null,
): BrandTokens {
  if (!presetName) return brandTokens;

  switch (presetName) {
    case "dashboard-tech":
      return {
        ...brandTokens,
        ...DASHBOARD_TECH_TOKENS,
        // markInner + businessName always come from BrandKit — the
        // preset overrides palette and type, not brand identity.
        markInner: brandTokens.markInner,
        businessName: brandTokens.businessName,
      };

    // Other presets ship in subsequent commits. Falling through to
    // editorial-bold (= unchanged BrandKit tokens) keeps every reel
    // rendering for now.
    case "editorial-bold":
    case "soft-minimal":
    case "luxury":
    case "studio-craft":
    case "documentary":
    case "generic":
    default:
      return brandTokens;
  }
}
