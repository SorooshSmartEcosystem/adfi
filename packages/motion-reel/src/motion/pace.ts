// Pace utility — turns the agent's `pace` design knob (slow/medium/fast)
// into concrete scene-duration multipliers + animation easings.
//
// Today the agent emits per-scene durations (e.g. duration: 3) and the
// renderer trusts those exactly. That made `pace` a decorative field —
// changing it had no visible effect. With this util the renderer
// stretches or compresses the agent's durations and switches easing
// curves to actually feel different per pace.
//
// Why per-scene multiplication over a global cap: scenes have different
// minimum readable times (a 200-char quote needs longer than a
// 6-letter hook). Multiplying preserves the agent's relative pacing
// (hook short, quote long) while dialing the absolute speed.

import { Easing } from "remotion";

export type Pace = "slow" | "medium" | "fast";

export function paceMultiplier(pace: Pace | undefined): number {
  switch (pace) {
    case "slow":
      return 1.35; // meditative, ~+35% per scene
    case "fast":
      return 0.75; // energetic, ~-25% per scene
    case "medium":
    default:
      return 1.0;
  }
}

// Animation easing — slow paces use restrained ease.out, fast paces
// use the springy ease.out(back) which lands punchy. Used for the
// dominant transform animation per scene (scale-in on hook, etc.).
export function paceEasing(pace: Pace | undefined): (t: number) => number {
  switch (pace) {
    case "slow":
      return Easing.out(Easing.cubic);
    case "fast":
      return Easing.out(Easing.back(1.6));
    case "medium":
    default:
      return Easing.out(Easing.back(1.2));
  }
}

// Shared frame-count helper used wherever scenes pick stagger offsets.
// Stagger between sub-elements is shorter on fast pace, longer on slow.
export function paceStaggerFrames(pace: Pace | undefined): number {
  switch (pace) {
    case "slow":
      return 14;
    case "fast":
      return 6;
    case "medium":
    default:
      return 10;
  }
}
