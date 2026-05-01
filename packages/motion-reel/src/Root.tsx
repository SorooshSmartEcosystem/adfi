// Remotion entry point. Registers every composition we want
// available in `remotion studio` (the dev preview) and via
// `renderMedia()` (the server pipeline).
//
// Each <Composition> entry maps a stable id → React component +
// dimensions + duration + default props. The default props power
// the studio preview; production renders pass real data via the
// `inputProps` argument to renderMedia.
//
// `script-reel` is the canonical composition going forward — it
// plays a multi-scene VideoScript. The legacy `quote-reel` and
// `stat-reel` compositions stay registered for backward compat
// with drafts persisted under the older single-template
// MotionDirective shape.

import { Composition } from "remotion";
import { QuoteReel } from "./compositions/QuoteReel";
import { StatReel } from "./compositions/StatReel";
import { ScriptReel, computeScriptFrames } from "./compositions/ScriptReel";
import { DIMENSIONS, type VideoScript } from "./types";

const FPS = 30;

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

// Demo script for the studio preview — represents a 6-beat reel
// pulled from a real-ish copy-trading-style post. The shape of this
// is what the video agent emits in production.
const PREVIEW_SCRIPT: VideoScript = {
  scenes: [
    { type: "hook", headline: "51%", subtitle: "of copy traders finished 2025 in profit.", duration: 3 },
    {
      type: "contrast",
      leftLabel: "WITH PEER FEEDS",
      leftValue: "51%",
      rightLabel: "SOLO RETAIL",
      rightValue: "20%",
      caption: "the gap is the conversation.",
      duration: 3,
    },
    {
      type: "quote",
      quote: "this isn't a pitch for blind copying. it's the case for trading next to someone whose entries, invalidations, and stop-outs are on the record.",
      duration: 5,
    },
    {
      type: "stat",
      value: 70,
      suffix: "%",
      label: "USED PEER INSIGHTS IN 2024",
      duration: 3,
    },
    {
      type: "punchline",
      line: "the edge was never the secret indicator. it was the feed.",
      emphasis: "feed",
      duration: 4,
    },
    { type: "brand-stamp", cta: "DM 'feed' for who's worth following.", duration: 3 },
  ],
  design: {
    style: "bold",
    accent: "attn",
    pace: "medium",
    statusLabel: "TODAY'S NOTE",
    hookLabel: "WHY IT MATTERS",
    metaLabel: "BACKSTORY",
    closerLabel: "FOLLOW",
  },
};

export const Root: React.FC = () => {
  return (
    <>
      {/* Multi-scene script — canonical going forward */}
      <Composition
        id="script-reel"
        component={ScriptReel}
        fps={FPS}
        width={DIMENSIONS.vertical.width}
        height={DIMENSIONS.vertical.height}
        durationInFrames={computeScriptFrames(PREVIEW_SCRIPT, FPS)}
        defaultProps={{ tokens: PREVIEW_TOKENS, script: PREVIEW_SCRIPT }}
        // Production renders set durationInFrames via calculateMetadata
        // by inspecting the script's scene durations. Studio uses the
        // PREVIEW_SCRIPT total above.
        calculateMetadata={({ props }) => {
          const fps = FPS;
          return {
            durationInFrames: computeScriptFrames(props.script, fps),
            fps,
          };
        }}
      />

      {/* Legacy single-template compositions — kept for back-compat */}
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
            quote: "every glaze tells a story. we just listen long enough to hear it.",
            attribution: "— rosa, founder",
          },
          design: {
            style: "warm" as const,
            accent: "alive" as const,
            pace: "medium" as const,
            statusLabel: "FROM THE STUDIO",
            hookLabel: "ON HONEST WORK",
            metaLabel: "BACKSTORY",
            closerLabel: "PUBLISHED",
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
            context: "your reels outperformed 80% of past posts. one designer booked a $4-8k project off a single dm.",
          },
          design: {
            style: "minimal" as const,
            accent: "alive" as const,
            pace: "medium" as const,
            statusLabel: "STRATEGIST · WEEKLY",
            hookLabel: "REVENUE THIS WEEK",
            metaLabel: "WHAT HAPPENED",
            closerLabel: "YOUR WEEK",
          },
        }}
      />
    </>
  );
};
