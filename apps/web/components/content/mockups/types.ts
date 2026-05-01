// Shared types + helpers for platform mockups.

// Normalized draft content — flat shape every mockup reads from.
// Echo emits different shapes per format (SINGLE_POST has heroImage
// + body + hook; CAROUSEL has coverSlide + bodySlides + caption;
// EMAIL_NEWSLETTER has subject + sections + heroImage). The
// normalizer in normalize.ts collapses all of those into this.
export type DraftContent = {
  caption?: string;
  hook?: string;
  body?: string;
  hashtags?: string[];
  imageUrl?: string;
  // Carousel slides (cover + body + closer flattened in order).
  slides?: { imageUrl?: string; headline?: string; body?: string }[];
  // Email
  subject?: string;
  preheader?: string;
  sections?: { heading?: string; body: string }[];
  cta?: { label: string; link?: string | null } | null;
  // Reel scenes — informational only (the inline <video> is the real preview).
  scenes?: unknown[];
};

export type MockupBusiness = {
  name: string;
  handle?: string; // @handle for X/IG
  logoUrl?: string | null;
  initials: string;
  verified?: boolean;
};

// Action menu trigger inside the platform's own header (where the
// `⋯` glyph already lives in real IG/X/LinkedIn UIs). Each mockup
// renders ONLY the trigger; the parent renders the popover content
// itself, OUTSIDE the mockup's overflow-hidden wrapper, so the popover
// can extend below the card without being clipped.
export type MockupMenu = {
  onToggle: () => void;
};

export type MockupProps = {
  business: MockupBusiness;
  content: DraftContent;
  // Optional mp4 URL for reel/video playback.
  mp4Url?: string | null;
  // Optional menu — when present, the platform's own ⋯ button opens it.
  menu?: MockupMenu;
};

export function pickPrimaryText(content: DraftContent): string {
  return (
    content.caption ??
    content.body ??
    content.hook ??
    content.subject ??
    "draft"
  );
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}
