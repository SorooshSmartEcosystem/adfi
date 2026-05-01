// Industry preview library — sample VideoScripts for Remotion Studio.
//
// Each preview defines:
//   - id      : stable composition id used by Remotion Studio
//   - name    : human label shown in the studio sidebar
//   - tokens  : a representative BrandKit-style token set (palette,
//               business name, fake logo SVG)
//   - script  : the VideoScript the agent would emit for this industry
//
// All previews render entirely in the browser via `pnpm preview` —
// nothing here costs Lambda credits or AWS charges. Useful for:
//   - Designing new scene types against varied content
//   - Showing a prospect what their industry looks like before signup
//   - Visual regression checking when changing a primitive
//
// To add a new preview: drop a new file in this dir, export a Preview
// object, and add it to PREVIEWS below. Root.tsx auto-registers a
// composition per entry.

import type { BrandTokens, VideoScript } from "../types";

export type Preview = {
  id: string; // stable composition id, e.g. "preview-renovation"
  name: string; // display label, e.g. "Renovation · 50s"
  tokens: BrandTokens;
  script: VideoScript;
};

import { renovationPreview } from "./renovation";
import { fitnessPreview } from "./fitness";
import { legalPreview } from "./legal";
import { restaurantPreview } from "./restaurant";
import { saasPreview } from "./saas";
import { copyTradingPreview } from "./copy-trading";

export const PREVIEWS: Preview[] = [
  renovationPreview,
  fitnessPreview,
  legalPreview,
  restaurantPreview,
  saasPreview,
  copyTradingPreview,
];
