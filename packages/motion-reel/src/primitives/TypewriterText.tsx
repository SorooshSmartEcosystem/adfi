// Typewriter text — types characters in over a span of frames.
// Driven by Remotion's useCurrentFrame; deterministic at every frame.
//
// Why character-based instead of word-based: a character cursor
// matches the landing-page feel where text *appears* in real time,
// not just snaps in word by word. Cheap and reliable.

import { useCurrentFrame, interpolate } from "remotion";

type Props = {
  // The text to type in. Newlines are preserved — the cursor doesn't
  // pause at line breaks any longer than at any other character.
  children: string;
  // Frame at which typing starts. Defaults to 0.
  startFrame?: number;
  // How many frames to take typing the entire string. Defaults to
  // `text.length * 1.4` — enough that 24-char strings finish in ~1s
  // at 30fps. Override for slower / faster cadence.
  durationFrames?: number;
  // Show a blinking caret while typing. Off by default — the moving
  // edge is enough motion; the caret can feel hokey.
  showCaret?: boolean;
  // Style overrides for the wrapping span.
  style?: React.CSSProperties;
};

export function TypewriterText({
  children,
  startFrame = 0,
  durationFrames,
  showCaret = false,
  style,
}: Props) {
  const frame = useCurrentFrame();
  const text = children;
  const total = durationFrames ?? Math.max(8, Math.round(text.length * 1.4));

  // Local frame from the typewriter's POV, clamped at start.
  const localFrame = Math.max(0, frame - startFrame);
  const progress = interpolate(localFrame, [0, total], [0, 1], {
    extrapolateRight: "clamp",
  });
  const visibleChars = Math.round(progress * text.length);
  const visible = text.slice(0, visibleChars);

  // Caret blinks at 2Hz (30fps → toggle every 15 frames).
  const caretOn = showCaret && Math.floor(frame / 15) % 2 === 0 && progress < 1;

  return (
    <span style={style}>
      {visible}
      {caretOn ? <span style={{ opacity: 0.6 }}>▌</span> : null}
    </span>
  );
}
