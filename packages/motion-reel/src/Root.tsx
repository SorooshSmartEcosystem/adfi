// Remotion entry point. Registers every composition we want
// available in `remotion studio` (the dev preview) and via
// `renderMedia()` (the server pipeline once Phase 2 lands).
//
// Each <Composition> entry maps a stable id → React component +
// dimensions + duration + default props. The default props power
// the studio preview; production renders pass real data via the
// `inputProps` argument to renderMedia.

import { Composition } from "remotion";
import { QuoteReel } from "./compositions/QuoteReel";
import { StatReel } from "./compositions/StatReel";
import { DIMENSIONS } from "./types";

const FPS = 30;

// Default brand tokens for the studio preview. Real renders pass the
// per-business BrandKit through inputProps. Shape mirrors @orb/ui
// tokens so the preview and production look identical.
const PREVIEW_TOKENS = {
  bg: "#FAFAF7",
  surface: "#F2EFE5",
  surface2: "#F8F5EA",
  border: "#E5E3DB",
  ink: "#111111",
  ink2: "#444444",
  ink3: "#666666",
  ink4: "#888888",
  alive: "#7CE896",
  aliveDark: "#3A9D5C",
  attnBg: "#FFF9ED",
  attnBorder: "#F0D98C",
  attnText: "#8A6A1E",
  businessName: "rosa pottery",
};

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="quote-reel"
        component={QuoteReel}
        durationInFrames={9 * FPS}
        fps={FPS}
        width={DIMENSIONS.vertical.width}
        height={DIMENSIONS.vertical.height}
        defaultProps={{
          tokens: PREVIEW_TOKENS,
          content: {
            quote:
              "every glaze tells a story. we just listen long enough to hear it.",
            attribution: "— rosa, founder",
          },
        }}
      />

      <Composition
        id="stat-reel"
        component={StatReel}
        durationInFrames={8 * FPS}
        fps={FPS}
        width={DIMENSIONS.vertical.width}
        height={DIMENSIONS.vertical.height}
        defaultProps={{
          tokens: PREVIEW_TOKENS,
          content: {
            value: 4200,
            prefix: "$",
            label: "THIS WEEK",
            context:
              "your reels outperformed 80% of past posts. one designer booked a $4-8k project off a single dm.",
          },
        }}
      />
    </>
  );
};
