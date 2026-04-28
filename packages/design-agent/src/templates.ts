// Phase 5 — real-world application templates.
//
// Pure code, no LLM. Pre-built SVG templates with `{{slot}}` placeholders;
// at render time we fill the slots with the client's palette tokens and
// the inner contents of their generated logo mark. Output is deterministic
// and looks consistent across clients because the layout never changes —
// only the brand tokens do.
//
// Templates live as TS string exports in template-strings.ts (NOT
// .svg files read at runtime) — see the comment there for why.

import type { AppliedTemplates, Palette, TemplateSlots } from "./types";
import { TEMPLATE_STRINGS, type TemplateName } from "./template-strings";

// Substitute every `{{key}}` in the SVG with `slots[key]`. Keys that
// appear in the template but not in `slots` are left intact so a missing
// slot is visible (rather than silently rendering an empty string).
export function applySlots(svg: string, slots: TemplateSlots): string {
  return svg.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return key in slots ? slots[key]! : match;
  });
}

// Inputs the template renderer needs from upstream phases.
export type TemplateInputs = {
  palette: Palette;
  // Inner SVG fragment (no outer `<svg>` wrapper) for the mark. The
  // logo phase produces a complete `<svg viewBox="0 0 100 100">…</svg>`;
  // we extract the inner contents so the mark can be transformed and
  // placed inside any template's `{{markInner}}` slot.
  markInner: string;
  businessName: string;
  tagline?: string;
  url?: string;
  contactLine?: string;
  // Two short headline lines for the instagram-post template. If omitted,
  // we fall back to the business name + tagline.
  headline?: string;
  headlineLine2?: string;
};

// Build the slot map from structured inputs. Centralized so every
// template renders against the same vocabulary (`primary`, `ink`, etc.).
function buildSlots(input: TemplateInputs): TemplateSlots {
  const p = input.palette;
  return {
    primary: p.primary.hex,
    secondary: p.secondary.hex,
    accent: p.accent.hex,
    ink: p.ink.hex,
    surface: p.surface.hex,
    background: p.background.hex,
    border: p.border.hex,
    markInner: input.markInner,
    businessName: input.businessName,
    tagline: input.tagline ?? "",
    url: input.url ?? "",
    contactLine: input.contactLine ?? "",
    headline: input.headline ?? input.businessName,
    headlineLine2: input.headlineLine2 ?? input.tagline ?? "",
  };
}

// Strip the outer `<svg …>…</svg>` wrapper so the mark can be placed
// inside another svg with its own viewBox + transforms. Caller is
// responsible for providing a transform that rescales to its template
// frame (the templates already include `transform="translate … scale …"`).
//
// Falls back to the input unchanged if the wrapper isn't a single root
// element — better to render the full svg-in-svg than to corrupt the mark.
export function extractMarkInner(svgString: string): string {
  const match = svgString.match(/<svg[^>]*>([\s\S]*)<\/svg>\s*$/);
  return match?.[1]?.trim() ?? svgString;
}

// Render a single template by name. Exposed so callers can render one
// template at a time (e.g. only the favicon for a quick UI preview).
export function renderTemplate(
  name: TemplateName,
  input: TemplateInputs,
): string {
  return applySlots(TEMPLATE_STRINGS[name], buildSlots(input));
}

// Render all five templates at once. Cheap (string substitution); use
// this when persisting a full BrandKit version.
export function renderAllTemplates(input: TemplateInputs): AppliedTemplates {
  return {
    favicon: renderTemplate("favicon-template", input),
    socialAvatar: renderTemplate("social-avatar-template", input),
    businessCard: renderTemplate("business-card-template", input),
    emailHeader: renderTemplate("email-header-template", input),
    instagramPost: renderTemplate("instagram-post-template", input),
  };
}
