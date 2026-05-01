// Shared types + helpers for platform mockups. Keeps each platform
// component focused on its visual shell while pulling content from
// the same shape.

export type DraftContent = {
  // Common
  caption?: string;
  hook?: string;
  body?: string;
  hashtags?: string[];

  // IG / FB / X
  imageUrl?: string;

  // Carousel
  slides?: { imageUrl?: string; headline?: string; body?: string }[];

  // Email newsletter
  subject?: string;

  // Reel
  scenes?: unknown[]; // VideoScript shape
};

export type MockupBusiness = {
  name: string;
  handle?: string; // @handle for X/IG
  logoUrl?: string | null;
  initials: string;
  verified?: boolean;
};

export type MockupProps = {
  business: MockupBusiness;
  content: DraftContent;
  // Optional mp4 URL for reel/video playback. When present, an inline
  // <video> renders inside the platform frame.
  mp4Url?: string | null;
};

// Pick the best title/text for any content shape so mockups can do
// reasonable rendering even when the agent's output shape varies.
export function pickPrimaryText(content: DraftContent): string {
  return (
    content.caption ??
    content.hook ??
    content.body ??
    content.subject ??
    "draft"
  );
}

// Truncate with a "more" suffix that mimics each platform's behavior.
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}
