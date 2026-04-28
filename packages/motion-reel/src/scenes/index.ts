// Scene registry. Add new scenes here as they ship — each entry maps
// a stable id to the scene module so the render pipeline can resolve
// "render scene 'signal' for business X" via the id.

import { signalScene } from "./signal";
import type { Scene } from "../types";

// The map carries the scene definitions; the render pipeline looks
// up by id. Cast to a generic Scene<unknown> at the registry level so
// the registry doesn't need a discriminated union — callers narrow
// via the per-scene exports.
export const SCENES: Record<string, Scene<unknown>> = {
  signal: signalScene as Scene<unknown>,
};

export type SceneId = keyof typeof SCENES;
export const SCENE_IDS = Object.keys(SCENES) as SceneId[];

export { signalScene };
