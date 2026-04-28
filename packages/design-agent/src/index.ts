// Public entry point for the Design agent.
//
// The 6-phase pipeline (kernel → palette → logo → graphics → templates →
// voice) is intentionally split into per-phase modules so each phase
// ships independently. This file re-exports the surface that other
// packages consume.
//
// Currently shipped:
//   Phase 2 — palette generation (color.ts) — pure code, no LLM
//   Phase 5 — application templates (templates.ts) — pure code, no LLM
//
// Pending (require LLM integration):
//   Phase 1 — brand kernel
//   Phase 3 — logo composition (SVG, never raster)
//   Phase 4 — brand graphics (abstract SVG compositions)
//   Phase 6 — brand voice prose

export type {
  AppliedTemplates,
  BrandGraphic,
  BrandKernel,
  BrandKitArtifact,
  BrandVoice,
  ColorRole,
  ContrastReport,
  IndustryCategory,
  LogoSet,
  Palette,
  TemplateSlots,
} from "./types";

export {
  ColorMath,
  contrastRatio,
  generatePalette,
  hexToColorRole,
  validatePaletteContrast,
} from "./color";

export {
  applySlots,
  extractMarkInner,
  renderAllTemplates,
  renderTemplate,
  type TemplateInputs,
} from "./templates";
