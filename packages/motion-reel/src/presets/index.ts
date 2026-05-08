// Public preset API. Re-exports the editorial-bold preset (the only
// one shipped today) plus the picker and shared types. Future
// presets register here.

export { editorialBoldPreset } from "./editorial-bold";
export { dashboardTechPreset } from "./dashboard-tech";
export { applyPresetTokens } from "./applyPresetTokens";
export { BoldStatementScene } from "./editorial-bold/BoldStatementScene";
export { IconListScene } from "./editorial-bold/IconListScene";
export { NumberedDiagramScene } from "./editorial-bold/NumberedDiagramScene";
export { EditorialOpenerScene } from "./editorial-bold/EditorialOpenerScene";
export { EditorialClosingScene } from "./editorial-bold/EditorialClosingScene";

export type { BoldStatementShape } from "./editorial-bold/BoldStatementScene";
export type { IconListShape } from "./editorial-bold/IconListScene";
export type { NumberedDiagramShape } from "./editorial-bold/NumberedDiagramScene";
export type { EditorialOpenerShape } from "./editorial-bold/EditorialOpenerScene";
export type { EditorialClosingShape } from "./editorial-bold/EditorialClosingScene";

export { pickPreset } from "./pickPreset";
export type { Preset, PresetName, PresetSceneName } from "./types";
