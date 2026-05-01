// Remotion entry point. Registers every composition we want
// available in `remotion studio` (the dev preview) and via
// `renderMedia()` (the server pipeline).
//
// `script-reel` is the canonical composition going forward — it
// plays a multi-scene VideoScript. The legacy `quote-reel` and
// `stat-reel` compositions stay registered for backward compat
// with drafts persisted under the older single-template
// MotionDirective shape.
//
// Industry sample compositions (preview-renovation, preview-fitness,
// etc.) are registered from `src/previews/*` for local studio use —
// they're cheap to scrub through (no Lambda, no tokens) and serve as
// design references for varied content shapes.

import { Composition } from "remotion";
import { QuoteReel } from "./compositions/QuoteReel";
import { StatReel } from "./compositions/StatReel";
import { ScriptReel, computeScriptFrames } from "./compositions/ScriptReel";
import { DIMENSIONS } from "./types";
import { PREVIEWS } from "./previews";

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

export const Root: React.FC = () => {
  return (
    <>
      {/* Canonical multi-scene composition. Production renders use
          this id; inputProps carry the actual script. */}
      <Composition
        id="script-reel"
        component={ScriptReel}
        fps={FPS}
        width={DIMENSIONS.vertical.width}
        height={DIMENSIONS.vertical.height}
        durationInFrames={computeScriptFrames(PREVIEWS[0]!.script, FPS)}
        defaultProps={{
          tokens: PREVIEWS[0]!.tokens,
          script: PREVIEWS[0]!.script,
        }}
        calculateMetadata={({ props }) => {
          return {
            durationInFrames: computeScriptFrames(props.script, FPS),
            fps: FPS,
          };
        }}
      />

      {/* Industry samples — one composition per preview file. Each
          has fixed tokens + script so studio shows them as separate
          entries in the sidebar. Click in, scrub, iterate. */}
      {PREVIEWS.map((preview) => (
        <Composition
          key={preview.id}
          id={preview.id}
          component={ScriptReel}
          fps={FPS}
          width={DIMENSIONS.vertical.width}
          height={DIMENSIONS.vertical.height}
          durationInFrames={computeScriptFrames(preview.script, FPS)}
          defaultProps={{ tokens: preview.tokens, script: preview.script }}
          // calculateMetadata is intentionally omitted — these previews
          // have static scripts so the duration in defaultProps is
          // authoritative.
        />
      ))}

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
