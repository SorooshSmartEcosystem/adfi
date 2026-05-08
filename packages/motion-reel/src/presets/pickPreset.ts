// pickPreset — deterministic mapper from (industry + brand voice) →
// preset name. Cheap regex/keyword lookup, no LLM call. The video
// agent runs this BEFORE generating the script so the chosen preset
// can shape the agent's available scene catalog and the renderer's
// visual treatment.
//
// Mapping rules are deliberately simple — match common solopreneur
// industries to their best-fit preset. Unrecognized industries fall
// back to `editorial-bold` (the most generally professional default).
//
// User can override per video via a `preset` field on VideoScript;
// the picker is just the default.

import type { PresetName } from "./types";

type PickArgs = {
  // Free-text business description from BrandKit. Required.
  industry?: string | null;
  // Strategist's brand-voice summary (tone, pillars). Optional.
  brandVoice?: string | null;
  // Explicit user override. Wins if set.
  override?: PresetName | null;
};

export function pickPreset({
  industry,
  brandVoice,
  override,
}: PickArgs): PresetName {
  if (override) return override;

  const text = [industry ?? "", brandVoice ?? ""].join(" ").toLowerCase();
  if (!text.trim()) return "editorial-bold";

  // Industry → preset rules. Specific matches first; generic
  // fallbacks last. Comments document the reasoning per category.

  // Fintech / data / SaaS / dev / AI → dashboard-tech (shipped
  // 2026-05-08 as a token-override preset; same scene catalog as
  // editorial-bold but dark-mode tokens + monospace body).
  if (
    /\b(fintech|finance|crypto|trading|invest|stock|etf|saas|software|developer|startup|api|data|analytics|dashboard|ai|machine learning|ml|llm)\b/.test(
      text,
    )
  ) {
    return "dashboard-tech";
  }

  // Wellness / coaching / mindfulness / family → soft-minimal (planned)
  if (
    /\b(wellness|yoga|meditation|coach|coaching|therap|mindful|family|parent|spirit|kids)\b/.test(
      text,
    )
  ) {
    return "editorial-bold"; // TODO: "soft-minimal"
  }

  // Luxury / fashion / hospitality / fine dining / real estate → luxury
  if (
    /\b(luxury|fashion|jewel|hotel|resort|fine dining|restaurant|cuisine|interior|architect|real estate|property)\b/.test(
      text,
    )
  ) {
    return "editorial-bold"; // TODO: "luxury"
  }

  // Handmade / craft / ceramics / food / makers → studio-craft
  if (
    /\b(pottery|ceramic|craft|handmade|maker|woodwork|baker|pastry|chef|farm|artisan|art studio)\b/.test(
      text,
    )
  ) {
    return "editorial-bold"; // TODO: "studio-craft"
  }

  // Education / news / public-interest / journalism → documentary
  if (
    /\b(education|teach|tutor|news|journal|history|nonprofit|charity|public|govern)\b/.test(
      text,
    )
  ) {
    return "editorial-bold"; // TODO: "documentary"
  }

  // Founder / business / consulting / opinion → editorial-bold (default)
  return "editorial-bold";
}
