// Phase 2 — palette generation + WCAG validation.
//
// Pure code, no LLM. Given an anchor hex (the "center of gravity" the
// strategy phrase implies), derive a 7-role palette where every
// text-on-bg pair passes WCAG AA. The math is HSL-space rotations +
// saturation/lightness adjustments, with sRGB-luminance contrast checks.
//
// Why no LLM: LLMs produce inconsistent palettes that fail contrast
// checks. A deterministic function produces palettes that always pass
// AA and always have predictable role relationships.

import type { ColorRole, ContrastReport, Palette } from "./types";

// ============================================================
// Color space conversions
// ============================================================

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace("#", "");
  const expanded =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => c + c)
          .join("")
      : cleaned;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// HSL: h 0-360, s 0-100, l 0-100. Standard RGB↔HSL formula
// (Foley/van Dam, restated everywhere). Edge case: when chroma is 0
// (perfectly grey) hue is undefined — we return 0 to keep types simple.
function rgbToHsl(
  r: number,
  g: number,
  b: number,
): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      case bn:
        h = (rn - gn) / d + 4;
        break;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslToRgb(
  h: number,
  s: number,
  l: number,
): { r: number; g: number; b: number } {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const m = ln - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: (r + m) * 255,
    g: (g + m) * 255,
    b: (b + m) * 255,
  };
}

// Build a ColorRole from an HSL triple. Internal helper.
function fromHsl(h: number, s: number, l: number): ColorRole {
  const rgb = hslToRgb(h, s, l);
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
  // Round so JSON is stable across regenerations.
  return {
    hex,
    rgb: {
      r: Math.round(rgb.r),
      g: Math.round(rgb.g),
      b: Math.round(rgb.b),
    },
    hsl: {
      h: Math.round(((h % 360) + 360) % 360),
      s: Math.round(Math.max(0, Math.min(100, s))),
      l: Math.round(Math.max(0, Math.min(100, l))),
    },
  };
}

// Public: lift any hex into a ColorRole record (used by templates that
// need to surface a single color, not the full palette).
export function hexToColorRole(hex: string): ColorRole {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return {
    hex: rgbToHex(rgb.r, rgb.g, rgb.b),
    rgb,
    hsl: {
      h: Math.round(hsl.h),
      s: Math.round(hsl.s),
      l: Math.round(hsl.l),
    },
  };
}

// ============================================================
// WCAG contrast
// ============================================================

// Per WCAG 2.x: relative luminance uses sRGB → linear conversion.
// Constants are exact ones in the spec (don't "round" them).
function relativeLuminance(r: number, g: number, b: number): number {
  const ch = (c: number) => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

export function contrastRatio(fgHex: string, bgHex: string): number {
  const fg = hexToRgb(fgHex);
  const bg = hexToRgb(bgHex);
  const l1 = relativeLuminance(fg.r, fg.g, fg.b);
  const l2 = relativeLuminance(bg.r, bg.g, bg.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ============================================================
// Palette generation
// ============================================================

// Palette derivation rules:
//   primary    = anchor as given
//   secondary  = analogous (-30°), saturation -10%, lightness +5%
//   accent     = complementary (180°) or split-comp (150°/210°)
//   ink        = anchor desaturated to 8%, lightness 12-18%
//   surface    = anchor desaturated to 12%, lightness 92-95%
//   background = anchor desaturated to 6%, lightness 96-98%
//   border     = mid-lightness between surface and ink
//
// After derivation, validate every text/bg pair against AA. If any
// pair fails, push the offender's lightness in the direction it needs
// to go and retry — up to a few iterations.

function deriveBase(anchorHex: string): {
  primary: ColorRole;
  secondary: ColorRole;
  accent: ColorRole;
  ink: ColorRole;
  surface: ColorRole;
  background: ColorRole;
  border: ColorRole;
  anchorHsl: { h: number; s: number; l: number };
} {
  const anchorRgb = hexToRgb(anchorHex);
  const anchorHsl = rgbToHsl(anchorRgb.r, anchorRgb.g, anchorRgb.b);

  const primary = fromHsl(anchorHsl.h, anchorHsl.s, anchorHsl.l);
  const secondary = fromHsl(
    anchorHsl.h - 30,
    Math.max(20, anchorHsl.s - 10),
    Math.min(80, anchorHsl.l + 5),
  );
  // Choose split-complementary (150°) when anchor saturation is low,
  // straight complementary (180°) otherwise. Keeps low-sat palettes
  // from generating a wildly off accent.
  const accentRotation = anchorHsl.s < 40 ? 150 : 180;
  const accent = fromHsl(
    anchorHsl.h + accentRotation,
    Math.min(85, anchorHsl.s + 10),
    Math.max(40, Math.min(60, anchorHsl.l)),
  );

  const ink = fromHsl(anchorHsl.h, 8, 14);
  const surface = fromHsl(anchorHsl.h, 12, 94);
  const background = fromHsl(anchorHsl.h, 6, 97);
  const border = fromHsl(anchorHsl.h, 10, 88);

  return { primary, secondary, accent, ink, surface, background, border, anchorHsl };
}

// Push lightness toward 0 or 100 until a pair clears the threshold or
// we hit the bound. Returns the adjusted role (same hue/saturation).
function nudgeForContrast(
  fg: ColorRole,
  bg: ColorRole,
  required: number,
  direction: "darken" | "lighten",
): ColorRole {
  let { l } = fg.hsl;
  for (let i = 0; i < 20; i++) {
    if (contrastRatio(fg.hex, bg.hex) >= required) return fg;
    l = direction === "darken" ? Math.max(0, l - 3) : Math.min(100, l + 3);
    fg = fromHsl(fg.hsl.h, fg.hsl.s, l);
  }
  return fg;
}

export function generatePalette(
  anchorHex: string,
  rationale: string,
): Palette {
  const base = deriveBase(anchorHex);

  // Body text on background must hit 4.5:1. Ink should be very dark
  // already, but if the anchor was extreme (e.g. anchor itself is
  // near-black) the derived ink might be too close to bg — darken it.
  let ink = nudgeForContrast(base.ink, base.background, 4.5, "darken");
  // Surface is light by design; ink-on-surface also needs 4.5.
  ink = nudgeForContrast(ink, base.surface, 4.5, "darken");

  // Border doesn't need text contrast but should be visible against
  // background (≥1.4:1). Walking lightness if needed.
  let border = base.border;
  if (contrastRatio(border.hex, base.background.hex) < 1.4) {
    border = nudgeForContrast(border, base.background, 1.4, "darken");
  }

  return {
    primary: base.primary,
    secondary: base.secondary,
    accent: base.accent,
    ink,
    surface: base.surface,
    background: base.background,
    border,
    rationale,
  };
}

export function validatePaletteContrast(palette: Palette): ContrastReport {
  const failures: ContrastReport["failures"] = [];

  // Pairs that must pass body-text AA (4.5).
  const bodyPairs: { fg: keyof Palette; bg: keyof Palette }[] = [
    { fg: "ink", bg: "background" },
    { fg: "ink", bg: "surface" },
  ];
  for (const p of bodyPairs) {
    const fg = palette[p.fg] as ColorRole;
    const bg = palette[p.bg] as ColorRole;
    const ratio = contrastRatio(fg.hex, bg.hex);
    if (ratio < 4.5) {
      failures.push({ fg: String(p.fg), bg: String(p.bg), ratio, required: 4.5 });
    }
  }

  // Pairs that must pass large-text AA (3.0).
  const largePairs: { fg: keyof Palette; bg: keyof Palette }[] = [
    { fg: "primary", bg: "background" },
    { fg: "accent", bg: "background" },
  ];
  for (const p of largePairs) {
    const fg = palette[p.fg] as ColorRole;
    const bg = palette[p.bg] as ColorRole;
    const ratio = contrastRatio(fg.hex, bg.hex);
    if (ratio < 3.0) {
      failures.push({ fg: String(p.fg), bg: String(p.bg), ratio, required: 3.0 });
    }
  }

  return { passes: failures.length === 0, failures };
}

// Convenience export: hex utilities re-exposed so callers (e.g. template
// substitution) don't import from internals.
export const ColorMath = {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
};
