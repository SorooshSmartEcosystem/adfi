export const colors = {
  bg: "#FAFAF7",
  ink: "#111",
  ink2: "#444",
  ink3: "#666",
  ink4: "#888",
  ink5: "#999",
  surface: "#F2EFE5",
  border: "#E5E3DB",
  border2: "#EEEBE0",
  alive: "#7CE896",
  aliveDark: "#3a9d5c",
  attentionBg: "#FFF9ED",
  attentionBorder: "#F0D98C",
  attentionText: "#8a6a1e",
  urgent: "#C84A3E",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
} as const;

export const fontFamilies = {
  sans: ["SF Pro Text", "Inter", "system-ui"],
  mono: ["SF Mono", "JetBrains Mono", "monospace"],
} as const;

export const fontWeights = {
  normal: 400,
  medium: 500,
} as const;

export const fontSizes = {
  xs: 13,
  sm: 14,
  base: 17,
  md: 18,
  lg: 20,
  xl: 23,
  "2xl": 28,
  "3xl": 34,
  "4xl": 43,
  "5xl": 53,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 20,
  "2xl": 24,
  full: 9999,
} as const;

export const borders = {
  hairline: 0.5,
  regular: 1,
  emphasis: 1.5,
} as const;

export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
export type FontFamilyToken = keyof typeof fontFamilies;
export type FontWeightToken = keyof typeof fontWeights;
export type FontSizeToken = keyof typeof fontSizes;
export type RadiusToken = keyof typeof radii;
export type BorderToken = keyof typeof borders;
