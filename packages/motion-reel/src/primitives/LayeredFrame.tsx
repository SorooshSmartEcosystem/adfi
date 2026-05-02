// LayeredFrame — full-bleed image background with darkening overlay
// and child text content layered on top. The first scene-shape that
// can actually consume Echo's b-roll image generation: today reels
// generate per-beat imageUrl values that the renderer ignores; this
// frame finally puts them on screen.
//
// Visual contract:
//   - Image fills the frame, object-cover.
//   - A linear-gradient or solid-color overlay sits between the image
//     and the children to keep text readable. `overlay` is a CSS
//     background string so callers can pass either.
//   - Children render in a centered flex column at full content area.

import { AbsoluteFill, Img } from "remotion";
import type { ReactNode } from "react";

type Props = {
  imageUrl: string;
  children: ReactNode;
  // Defaults to a bottom-heavy dark gradient that protects bottom-aligned
  // captions while leaving the upper half of the photo readable.
  overlay?: string;
  // Optional fallback color shown when the image hasn't loaded or is
  // null. Defaults to a deep ink so text stays visible.
  fallbackBg?: string;
  // Aligns children inside the layered frame. Default "center".
  align?: "top" | "center" | "bottom";
};

const DEFAULT_OVERLAY =
  "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.85) 100%)";

export const LayeredFrame: React.FC<Props> = ({
  imageUrl,
  children,
  overlay = DEFAULT_OVERLAY,
  fallbackBg = "#1a1a1a",
  align = "center",
}) => {
  const justify =
    align === "top" ? "flex-start" : align === "bottom" ? "flex-end" : "center";

  return (
    <AbsoluteFill style={{ background: fallbackBg }}>
      {imageUrl ? (
        <Img
          src={imageUrl}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: overlay,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: justify,
          padding: "0 64px 88px 64px",
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};
