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
  // Carousel slides (cover + body + closer flattened in order — used
  // by anything that just wants thumbnails).
  slides?: { imageUrl?: string; headline?: string; body?: string }[];
  // Carousel — rich shape with palette/template per slide. When
  // present, the IG mockup uses the proper artboard slide views (one
  // designed slide per index) rather than the flat slides[] above.
  carousel?: {
    cover: {
      palette?: string;
      title: string;
      subtitle?: string | null;
      visualDirection?: string;
      imageUrl?: string | null;
    };
    body: Array<{
      template?: string;
      palette?: string;
      headline: string;
      body: string;
      number?: string | null;
      quoteAttribution?: string | null;
      bulletPoints?: string[] | null;
      visualDirection?: string;
      imageUrl?: string | null;
    }>;
    closer: {
      palette?: string;
      title: string;
      body: string;
      cta?: string | null;
    };
  };
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
  // Reel mockup only: callback to create the video when no mp4Url
  // exists. Wires the empty-state placeholder into a real button so
  // the user can tap once to render — no menu hunt required.
  onCreateVideo?: () => void;
  // True while the video script is being drafted or rendered. The
  // reel mockup uses this to show "creating video…" on the placeholder
  // so the user gets feedback their tap landed.
  videoBusy?: boolean;
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
