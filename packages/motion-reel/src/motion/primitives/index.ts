// Motion primitive library — building blocks scenes compose from.
//
// Every primitive is reusable across scene types. Scenes call a
// `composeMotion(brandSeed, sceneIndex)` helper to deterministically
// pick which primitives and parameters to apply — same draft
// re-renders identically, but two consecutive scenes (or two
// different drafts) get visibly different motion.
//
// This is the architecture that breaks "every render of the same
// scene type looks identical." A `bold-statement` doesn't
// hard-code its motion any more — it asks the composer "what
// motion bundle for THIS scene?" and the composer picks from the
// primitive library.

export { MaskedReveal, type MaskShape } from "./MaskedReveal";
export {
  ParallaxDepth,
  ParallaxLayer,
} from "./ParallaxDepth";
export { ParticleField } from "./ParticleField";
export { KineticLetters } from "./KineticLetters";
export { CameraMove } from "./CameraMove";
export { GradientSweep } from "./GradientSweep";
export { LensFlare } from "./LensFlare";
export { ProceduralShape } from "./ProceduralShape";
export { VignettePulse } from "./VignettePulse";
export { AccentRule } from "./AccentRule";
export { CountdownNumber } from "./CountdownNumber";
export { MotionStreaks } from "./MotionStreaks";
export { AnimatedBars } from "./AnimatedBars";
export { GridPattern } from "./GridPattern";
// Session 2 batch — 8 more primitives (21 total)
export { Typewriter } from "./Typewriter";
export { GlitchText } from "./GlitchText";
export { SlidePanel } from "./SlidePanel";
export { ArrowDraw } from "./ArrowDraw";
export { BracketCorners } from "./BracketCorners";
export { HalftoneOverlay } from "./HalftoneOverlay";
export { ChatBubble } from "./ChatBubble";
export { LowerThird } from "./LowerThird";

import type { MaskShape } from "./MaskedReveal";

// MotionRecipe — the composer's output. A scene reads this object
// and applies whichever primitives the recipe calls for.
//
// Expanded 2026-05-09 to pick from MORE primitives so every scene
// can layer multiple visible effects (was: cameraStyle + particles
// only). Now: gradient sweep, vignette pulse, bracket corners,
// halftone, grid pattern, accent rule — all seeded.
//
// Adding a new primitive means adding a new optional slot here
// without breaking existing scenes (they ignore slots they don't
// know about).
export type MotionRecipe = {
  // Cinematic camera move applied to the whole scene composition.
  cameraStyle?:
    | "dolly-in"
    | "dolly-out"
    | "pan-left"
    | "pan-right"
    | "handheld-shake"
    | "none";
  // Mask shape applied to the headline reveal. "none" = no mask
  // (default fade-in).
  maskShape?: MaskShape | "none";
  // Mask origin/direction params.
  maskOrigin?: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
  maskDirection?: "top" | "bottom" | "left" | "right";
  // Particle field overlaid on the scene. "none" = no particles.
  particleFlavor?: "dust" | "embers" | "geometric" | "none";
  // Kinetic-letters style for the hero text. "none" = default
  // word-by-word reveal (existing behavior).
  letterStyle?:
    | "cascade"
    | "rise"
    | "scale-in"
    | "scramble"
    | "rotate-in"
    | "directional"
    | "none";
  // Diagonal gradient sweep across the frame. "none" = no sweep.
  gradientSweep?:
    | "diagonal-tl-br"
    | "diagonal-tr-bl"
    | "horizontal"
    | "vertical"
    | "none";
  // Soft radial vignette breathing in/out. "none" = off.
  vignette?: "pulse" | "static" | "none";
  // Bracket corners framing the scene (technical aesthetic).
  // "none" = off.
  brackets?: "all-corners" | "top-only" | "none";
  // Halftone dot pattern overlay. "none" = off.
  halftone?: "static" | "rotate" | "none";
  // Grid pattern backdrop (dashboard-tech preset's natural backdrop).
  // "none" = off.
  gridBackdrop?: "static-fade" | "drift" | "none";
  // Accent rule decoration above hero text. "none" = off (the
  // accent rule above bold-statement headlines is hardcoded; this
  // recipe slot lets OTHER scenes opt-in).
  accentRule?: "draw-h" | "dot-rule" | "dashed" | "double" | "tick-marks" | "none";
  // Per-render seed — passed to primitives that need determinism
  // (ParticleField, KineticLetters with "directional"/"scramble").
  seed: number;
};

// Compose a recipe deterministically from (brandSeed, sceneIndex).
// Same inputs → same recipe, so re-rendering the same draft produces
// the same visuals; different scene indices in one reel produce
// visibly different motion.
export function composeMotion(args: {
  brandSeed: number;
  sceneIndex: number;
  // Which scene type — different scene types get different recipe
  // pools. Only "bold-statement" is composed for now; others fall
  // through to no recipe (existing behavior).
  sceneType?: string;
  // The scene's mood — confident/urgent get more dynamic recipes;
  // calm/contemplative get gentler ones. Optional.
  mood?: string;
}): MotionRecipe {
  const seed = (args.brandSeed * 31 + args.sceneIndex * 17) | 0;
  const r = (Math.sin(seed) * 10000) % 1; // 0-1 pseudo-random
  const r2 = (Math.sin(seed * 2.7) * 10000) % 1;
  const r3 = (Math.sin(seed * 4.1) * 10000) % 1;
  const pick = <T,>(arr: T[], v: number): T =>
    arr[Math.floor(Math.abs(v) * arr.length) % arr.length] as T;

  const calm = args.mood === "calm" || args.mood === "contemplative";
  const energetic =
    args.mood === "energetic" ||
    args.mood === "urgent" ||
    args.mood === "celebratory";

  const r4 = (Math.sin(seed * 5.9) * 10000) % 1;
  const r5 = (Math.sin(seed * 7.3) * 10000) % 1;
  const r6 = (Math.sin(seed * 9.1) * 10000) % 1;

  // Scene-type-specific recipe pools.
  if (args.sceneType === "bold-statement") {
    return {
      cameraStyle: pick(
        calm
          ? ["dolly-in", "dolly-out", "none"]
          : energetic
            ? ["dolly-in", "pan-left", "pan-right", "handheld-shake"]
            : ["dolly-in", "dolly-out", "pan-left", "pan-right", "none"],
        r,
      ),
      maskShape: pick(
        ["circle", "diagonal", "line-h", "line-v", "hexagon", "none"] as const,
        r2,
      ),
      maskOrigin: pick(
        ["center", "top-left", "bottom-right", "top-right", "bottom-left"] as const,
        r3,
      ),
      maskDirection: pick(
        ["top", "bottom", "left", "right"] as const,
        r,
      ),
      particleFlavor: calm
        ? pick(["dust", "none"] as const, r2)
        : pick(["dust", "embers", "geometric", "dust"] as const, r2),
      letterStyle: pick(
        calm
          ? ["cascade", "rise", "scale-in", "none"] as const
          : energetic
            ? ["scramble", "directional", "rotate-in", "scale-in"] as const
            : ["cascade", "rise", "scale-in", "rotate-in", "directional", "none"] as const,
        r3,
      ),
      // Visibility-biased 2026-05-09 — user wanted MORE visible
      // variety. Every scene now picks primitives from pools heavy
      // on actual options, light on "none".
      gradientSweep: pick(
        [
          "diagonal-tl-br",
          "diagonal-tr-bl",
          "horizontal",
          "vertical",
          "none",
        ] as const,
        r4,
      ),
      vignette: pick(["pulse", "static", "static", "none"] as const, r5),
      brackets: pick(
        ["all-corners", "top-only", "none", "none"] as const,
        r6,
      ),
      halftone: pick(["none", "static", "rotate", "none"] as const, r4),
      gridBackdrop: "none",
      accentRule: pick(
        ["draw-h", "dot-rule", "dashed", "double", "tick-marks", "none"] as const,
        r5,
      ),
      seed: Math.abs(seed),
    };
  }

  // Default: no composition (existing behavior preserved).
  return { seed: Math.abs(seed) };
}
