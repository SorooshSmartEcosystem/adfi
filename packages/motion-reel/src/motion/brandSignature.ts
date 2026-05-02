// brandSignature — deterministic per-brand visual seed. Each brand
// gets a unique fingerprint derived from its business name, used to
// pick layout cycle starting offset, default motif, and typography
// flavor. Without this, two brands rendering through the same preset
// look identical because the rotation logic uses scene-index alone.
//
// The signature is deterministic — same business name always
// produces the same seed — so renders are reproducible across
// agent calls and Lambda invocations.
//
// Replace this with real per-brand BrandKit fields (motif SVG,
// signature axes) when the design-agent ships per-brand motif
// generation. Until then, this hash gives every brand a stable but
// unique visual identity using only the existing BrandTokens.

export type BrandSignature = {
  // Number 0..7 — seeds layout rotation, transition rotation, and
  // motif selection. Two brands with different signatures cycle
  // through variants in different orders.
  seed: number;
  // Default motif when a scene needs one but the agent didn't emit
  // an explicit choice. Picked from the icon registry by hashing
  // the business name.
  defaultMotif: string;
  // Typography signature flavor:
  //   neutral  — default heavy display
  //   tight    — extra-tight tracking, condensed feel (fintech, tech)
  //   loose    — wider tracking, lighter weight (wellness, soft)
  //   editorial— italic accent for emphasis word (luxury, news)
  typographyFlavor: "neutral" | "tight" | "loose" | "editorial";
};

// Tiny non-crypto hash. Stable across runtimes (Node + browser).
function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  // Ensure non-negative
  return Math.abs(h);
}

const DEFAULT_MOTIFS = [
  "sparkle",
  "lightbulb",
  "target",
  "rocket",
  "globe",
  "star",
  "fire",
  "lightning",
] as const;

const FLAVORS: BrandSignature["typographyFlavor"][] = [
  "neutral",
  "tight",
  "loose",
  "editorial",
];

export function brandSignature(businessName: string): BrandSignature {
  const h = hash(businessName || "default");
  const seed = h % 8;
  const motifIdx = Math.floor(h / 8) % DEFAULT_MOTIFS.length;
  const flavorIdx = Math.floor(h / 64) % FLAVORS.length;
  return {
    seed,
    defaultMotif: DEFAULT_MOTIFS[motifIdx]!,
    typographyFlavor: FLAVORS[flavorIdx]!,
  };
}
