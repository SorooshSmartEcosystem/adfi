// fitText — picks a font size that fits a string into a target width
// based on character count. Used by the "big text" scenes (Hook,
// Stat, Punchline, Quote) where the agent emits strings of variable
// length and a hardcoded fontSize overflows the frame for long
// strings or wastes space for short ones.
//
// Why character count instead of measuring with canvas: we render
// inside Remotion which runs in headless Chromium under Lambda; we
// can't measure DOM ahead of time. Character count is a usable
// approximation for display-weight sans-serif at ~1080px width
// because we know the typical character advance width (~0.5em for
// SF Pro Display heavy at large sizes).

type FitTextOptions = {
  // The text to size. Required.
  text: string;
  // Maximum font size for very short strings. Default 320px (display).
  maxSize?: number;
  // Minimum font size (no smaller than this even if string is huge).
  // Default 80px — readable on a phone.
  minSize?: number;
  // Approximate character advance per em for the font in use. SF Pro
  // Display heavy ≈ 0.50, Inter heavy ≈ 0.55, italic serif ≈ 0.45.
  // Default 0.50.
  advance?: number;
  // Frame width minus side padding. Default 950 (1080 frame - 64*2).
  containerWidth?: number;
  // Allow up to this many lines to wrap before scaling down further.
  // Default 1 (single line). 2 is good for the hook subtitle. 3 for
  // long punchlines.
  maxLines?: number;
};

export function fitText({
  text,
  maxSize = 320,
  minSize = 80,
  advance = 0.5,
  containerWidth = 950,
  maxLines = 1,
}: FitTextOptions): number {
  const length = text.trim().length || 1;
  // Per-line character budget at the maximum size. If the actual
  // string fits in maxLines × budget, return maxSize.
  const maxBudgetPerLine = containerWidth / (maxSize * advance);
  if (length <= maxBudgetPerLine * maxLines) return maxSize;

  // Otherwise scale fontSize so that length fits into maxLines lines.
  // Each line at fontSize F holds containerWidth / (F * advance) chars.
  // Total chars = maxLines * (containerWidth / (F * advance)) = length.
  // Solve for F: F = (maxLines * containerWidth) / (length * advance).
  const target = (maxLines * containerWidth) / (length * advance);
  return Math.max(minSize, Math.min(maxSize, Math.floor(target)));
}
