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
  // Timestamp the post is scheduled for (or was published at). Drives
  // the platform-native date label inside each mockup ("2h", "Mar 14",
  // "scheduled for tomorrow at 9am") instead of the hardcoded
  // "just now". Falls back to "just now" when null/undefined.
  postedAt?: Date | string | null;
};

// Format a date the way each platform shows post times. Pure utility
// that the mockups call directly so they don't have to duplicate the
// formatting logic. Defaults to "just now" when no date is supplied.
export function formatPostedAt(
  postedAt: Date | string | null | undefined,
  platform: "instagram" | "twitter" | "linkedin" | "facebook" | "telegram" | "email" = "instagram",
): string {
  if (!postedAt) return "just now";
  const d = typeof postedAt === "string" ? new Date(postedAt) : postedAt;
  if (Number.isNaN(d.getTime())) return "just now";
  const now = Date.now();
  const ms = d.getTime() - now;
  const future = ms > 0;
  const absMs = Math.abs(ms);
  const mins = Math.round(absMs / 60_000);
  const hours = Math.round(absMs / 3_600_000);
  const days = Math.round(absMs / 86_400_000);

  // Future-dated (scheduled posts)
  if (future) {
    if (mins < 60) return `scheduled · ${mins}m`;
    if (hours < 24) return `scheduled · ${hours}h`;
    if (days < 7) return `scheduled · ${days}d`;
    // Longer than a week — show the calendar date in platform style
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    if (d.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
    return `scheduled · ${d.toLocaleDateString("en-US", opts)}`;
  }

  // Past-dated (published posts)
  switch (platform) {
    case "twitter":
      // X uses "2h", "1d", or absolute date for older
      if (mins < 1) return "now";
      if (mins < 60) return `${mins}m`;
      if (hours < 24) return `${hours}h`;
      if (days < 7) return `${days}d`;
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    case "instagram":
    case "facebook":
      // IG / FB use "2 hours ago", "1 day ago", "March 14"
      if (mins < 1) return "just now";
      if (mins < 60) return `${mins}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;
      return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    case "linkedin":
      if (mins < 1) return "now";
      if (mins < 60) return `${mins}m`;
      if (hours < 24) return `${hours}h`;
      if (days < 7) return `${days}d`;
      if (days < 30) return `${Math.round(days / 7)}w`;
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    case "telegram":
      if (mins < 1) return "now";
      if (hours < 24)
        return d.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    case "email":
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    default:
      return d.toLocaleDateString("en-US");
  }
}

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
