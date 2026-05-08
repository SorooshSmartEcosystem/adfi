// Typewriter — classic typewriter character-by-character reveal
// with optional blinking caret. Used for terminal scenes, quote
// reveals, code displays, "we're typing this in real time" beats.

"use client";

import { useCurrentFrame } from "remotion";

type Props = {
  text: string;
  // Frames per character. Default 1.5 (≈20 chars/sec at 30fps).
  charsPerFrame?: number;
  // Frame to start typing. Default 0.
  startFrame?: number;
  // Show blinking caret. Default true.
  caret?: boolean;
  // Caret blink rate (frames per blink). Default 18.
  caretBlinkFrames?: number;
  // Caret character. Default "▋".
  caretChar?: string;
  // Inline style applied to the wrapping span.
  style?: React.CSSProperties;
};

export const Typewriter: React.FC<Props> = ({
  text,
  charsPerFrame = 0.66,
  startFrame = 0,
  caret = true,
  caretBlinkFrames = 18,
  caretChar = "▋",
  style,
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const charsToShow = Math.floor(elapsed * charsPerFrame);
  const visibleText = text.slice(0, Math.min(charsToShow, text.length));
  const isTyping = charsToShow < text.length;
  const caretVisible = caret && (isTyping || Math.floor(frame / caretBlinkFrames) % 2 === 0);

  return (
    <span style={{ display: "inline-block", ...style }}>
      {visibleText}
      {caretVisible ? (
        <span style={{ opacity: 0.85, marginLeft: 2 }}>{caretChar}</span>
      ) : null}
    </span>
  );
};
