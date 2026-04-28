// Public surface for @orb/motion-reel.
//
// Phase 1 ships scene generators only — given (BrandTokens, content),
// each scene returns a complete standalone HTML document that
// auto-plays its choreography. The recording side (Puppeteer + headless
// Chromium + WebCodecs) lands in Phase 1.5 and lives in @orb/api.

export type {
  BrandTokens,
  Scene,
  SceneInput,
  SignalSceneContent,
} from "./types";

export {
  SCENES,
  SCENE_IDS,
  signalScene,
  type SceneId,
} from "./scenes";
