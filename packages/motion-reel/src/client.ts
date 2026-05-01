// Client-safe exports — for browser-side use with @remotion/player.
//
// The main entry (./index.ts) calls registerRoot() as a side effect
// which is a Remotion-specific bootstrap. That's fine for Remotion
// Studio and `renderMedia()`, but apps/web's <ScriptPreview> uses
// <Player> directly with the composition component. Importing from
// "@orb/motion-reel" would trigger registerRoot in the browser
// chunk for no benefit.
//
// This module re-exports just the React components + helpers that
// app code needs. No side effects.

export { ScriptReel, computeScriptFrames } from "./compositions/ScriptReel";
export { QuoteReel } from "./compositions/QuoteReel";
export { StatReel } from "./compositions/StatReel";

export type {
  BrandTokens,
  VideoDesign,
  VideoScript,
  Scene,
  HookScene,
  StatSceneShape,
  ContrastScene,
  QuoteSceneShape,
  PunchlineScene,
  ListSceneShape,
  HashtagScene,
  BrandStampScene,
  QuoteContent,
  StatContent,
  ListContent,
  ProductRevealContent,
  CarouselAsReelContent,
  MotionDirective,
  OutputFormat,
} from "./types";
export { DIMENSIONS } from "./types";
