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

import type { MaskShape } from "./MaskedReveal";

// MotionRecipe — the composer's output. A scene reads this object
// and applies whichever primitives the recipe calls for.
//
// Future expansion: more flags + parameter slots as the primitive
// library grows. Adding a new primitive means adding a new optional
// slot here without breaking existing scenes.
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
        ? "none"
        : pick(["dust", "geometric", "none", "none"] as const, r2),
      letterStyle: pick(
        calm
          ? ["cascade", "rise", "scale-in", "none"] as const
          : energetic
            ? ["scramble", "directional", "rotate-in", "scale-in"] as const
            : ["cascade", "rise", "scale-in", "rotate-in", "directional", "none"] as const,
        r3,
      ),
      seed: Math.abs(seed),
    };
  }

  // Default: no composition (existing behavior preserved).
  return { seed: Math.abs(seed) };
}
