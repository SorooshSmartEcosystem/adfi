// mood — modulates how aggressively scenes animate, how saturated
// accents render, and which typography weights are picked. The agent
// picks one mood per script based on the brief + brand voice. The
// renderer reads it everywhere a scene makes a choice that should
// match the post's energy.
//
// Without this, every reel for a given brand looks the same because
// pace + colors + typography are constant. Mood is the lever that
// makes "celebrating a milestone" look visibly different from
// "explaining a hard truth".

export type Mood =
  | "confident"
  | "calm"
  | "energetic"
  | "urgent"
  | "contemplative"
  | "celebratory";

export type MoodConfig = {
  // Multiplier on accent color saturation (0..1.4 range typical).
  // 1.0 = use BrandKit value as-is. <1 desaturates. >1 reads as
  // "the accent really pops".
  accentSaturation: number;
  // Display font weight for hero text. Heavier = louder.
  displayWeight: 700 | 750 | 800 | 850 | 900;
  // Whether to italicize the emphasis word. Used by editorial /
  // contemplative moods.
  emphasisItalic: boolean;
  // Pace-multiplier ON TOP OF design.pace. Lets mood compress or
  // stretch holds without overriding the agent's pace knob.
  paceFactor: number;
  // Per-letter stagger frames for kinetic typography on emphasis
  // word. Smaller = letters land faster.
  letterStagger: number;
  // Background tint over the preset's base color. Pure white for
  // most moods; tinted for celebratory + contemplative variations.
  // Empty string = no tint.
  bgTint: string;
};

export const MOOD_CONFIGS: Record<Mood, MoodConfig> = {
  confident: {
    accentSaturation: 1.0,
    displayWeight: 800,
    emphasisItalic: false,
    paceFactor: 1.0,
    letterStagger: 1.2,
    bgTint: "",
  },
  calm: {
    accentSaturation: 0.85,
    displayWeight: 700,
    emphasisItalic: false,
    paceFactor: 1.25,
    letterStagger: 2,
    bgTint: "",
  },
  energetic: {
    accentSaturation: 1.2,
    displayWeight: 900,
    emphasisItalic: false,
    paceFactor: 0.8,
    letterStagger: 0.8,
    bgTint: "",
  },
  urgent: {
    accentSaturation: 1.3,
    displayWeight: 900,
    emphasisItalic: false,
    paceFactor: 0.85,
    letterStagger: 0.6,
    bgTint: "",
  },
  contemplative: {
    accentSaturation: 0.7,
    displayWeight: 700,
    emphasisItalic: true,
    paceFactor: 1.4,
    letterStagger: 2.5,
    bgTint: "",
  },
  celebratory: {
    accentSaturation: 1.25,
    displayWeight: 850,
    emphasisItalic: false,
    paceFactor: 0.95,
    letterStagger: 1,
    bgTint: "rgba(255, 250, 230, 1)", // very subtle warm tint
  },
};

export function getMoodConfig(mood: Mood | undefined): MoodConfig {
  return MOOD_CONFIGS[mood ?? "confident"];
}

// Saturate / desaturate a hex color toward gray by a 0..2 factor.
// 1.0 returns the color unchanged. Used to apply mood.accentSaturation
// to BrandKit accent values without hardcoding palette assumptions.
export function adjustSaturation(hex: string, factor: number): string {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return hex;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  // Convert to HSL-ish — simplified
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const adjust = (c: number) => {
    const delta = c - l;
    const next = l + delta * factor;
    return Math.max(0, Math.min(255, Math.round(next)));
  };
  const out = (n: number) => n.toString(16).padStart(2, "0");
  return `#${out(adjust(r))}${out(adjust(g))}${out(adjust(b))}`;
}
