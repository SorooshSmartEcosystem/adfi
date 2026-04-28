// Remotion entry — required for `remotion studio` and `renderMedia`.
// Both look up `registerRoot()` to find the compositions tree.
//
// Also re-exports types so other workspace packages (@orb/api,
// apps/web) can import shared shapes without a runtime dep on
// the React side.

import { registerRoot } from "remotion";
import { Root } from "./Root";

registerRoot(Root);

export type {
  BrandTokens,
  CarouselAsReelContent,
  ListContent,
  MotionDirective,
  OutputFormat,
  ProductRevealContent,
  QuoteContent,
  StatContent,
} from "./types";
export { DIMENSIONS } from "./types";
