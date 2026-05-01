// Type system for the motion-reel pipeline.
//
// Design principle (same as @orb/design-agent): the choreography is
// hand-tuned once; brand tokens + content slots vary per business.
// Every composition is a React component that receives BrandTokens +
// content props and renders frames driven by Remotion's useCurrentFrame.

// Brand tokens consumed by every composition. Sourced from BrandKit
// on the server side; renderer treats them as opaque hex strings.
export type BrandTokens = {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  ink: string;
  ink2: string;
  ink3: string;
  ink4: string;
  alive: string;
  aliveDark: string;
  attnBg: string;
  attnBorder: string;
  attnText: string;
  // Inner SVG fragment (no outer <svg> wrapper) for the business mark.
  // Renderer falls back to a default orb when null/undefined.
  markInner?: string;
  businessName: string;
};

// ============================================================
// Content shapes — one per composition.
// Every shape is a plain JSON object so it round-trips through
// the database (Echo persists `motion: { template, slotValues }`
// on the ContentDraft) and through the render API.
// ============================================================

// QuoteReel: a single quote types in line-by-line over a textured
// brand backdrop. Closing card shows business name + mark.
// Use for: inspirational posts, value statements, opinion takes.
export type QuoteContent = {
  // The quote itself. ≤ 240 chars; longer gets truncated. The
  // typewriter splits on natural pauses (comma, period, em-dash).
  quote: string;
  // Optional attribution under the quote. e.g. "— rosa, founder".
  attribution?: string;
};

// StatReel: a big number counts up while a label sits beneath it.
// Optional context line below grounds the number in story.
// Use for: weekly stats, product specs, milestone announcements.
export type StatContent = {
  // Final number (or string with formatting). e.g. 4200 or "$4.2k"
  // or "98%". When a number is passed, the counter eases from 0 → it.
  value: number | string;
  // Optional prefix/suffix used when value is numeric. e.g. "$" / "%".
  prefix?: string;
  suffix?: string;
  // Short uppercase label above the number. e.g. "THIS WEEK".
  label: string;
  // Long-form context under the number. ≤ 140 chars.
  context: string;
};

// ListReel: 3 sequential fade-cards, each with a number + headline +
// short body. The classic "3 things to know about X" / "3 reasons" /
// "3 mistakes" reel.
export type ListContent = {
  // Title shown briefly at the start. e.g. "3 reasons handmade > mass".
  title: string;
  // 2–4 list items. UI assumes 3 most of the time.
  items: { headline: string; body: string }[];
};

// ProductReveal: hero photo (real, from Echo's image pipeline) zooms
// in while name + tagline + price/cta type underneath. Mark holds in
// the corner.
// Use for: new product launches, restocks, featured items.
export type ProductRevealContent = {
  // Public URL of the hero photo. Renderer fetches it during render.
  // For the dev preview, can be a localhost / data URL too.
  heroImageUrl: string;
  // Product name in the brand's voice. e.g. "matte black mug · 24oz"
  name: string;
  // Tagline / one-line description.
  tagline?: string;
  // Optional CTA + optional price. CTA renders as a pill; price
  // counts up like a StatReel number.
  priceLabel?: string; // e.g. "$48" or "free shipping today"
  cta?: string; // e.g. "shop now"
};

// CarouselAsReel: animates through Echo's existing carousel slides.
// Each slide gets a smooth crossfade + slot-aware text animations.
// Use for: turning a high-performing carousel into a Reel for free.
export type CarouselAsReelContent = {
  // Each slide carries its own image + text content. The composition
  // budgets ~3.5s per slide.
  slides: {
    imageUrl?: string; // optional — slide can be text-only
    headline: string;
    body?: string;
  }[];
};

// Design knobs the video agent sets per post so the same design
// system flexes to fit the industry, mood, and content type. All
// optional — sensible defaults exist in the renderer.
export type VideoDesign = {
  // Overall aesthetic. Drives card variant ladder + typography weight.
  //   minimal — all light cards, restrained type, slow pace
  //   bold — dark hero card with big display type, faster pace
  //   warm — amber/alive accents, more humanistic
  //   editorial — magazine-style, italic accents, longer holds
  style?: "minimal" | "bold" | "warm" | "editorial";
  // Primary accent color used on dots, underlines, hero numbers.
  //   alive — green (~ default growth / good news)
  //   attn — amber (~ caution / opportunity / urgency)
  //   urgent — red (~ stop-scroll, alarm)
  //   ink — black/white (no accent — most editorial)
  accent?: "alive" | "attn" | "urgent" | "ink";
  // Motion pacing — affects stagger between card reveals + total
  // duration of word-by-word reveals.
  //   slow — meditative, ~10-12s
  //   medium — default
  //   fast — energetic, ~6-7s, more cards
  pace?: "slow" | "medium" | "fast";
  // Optional copy overrides for the mono labels in cards. Lets the
  // agent adapt voice per post:
  //   statusLabel: top-of-screen status. e.g. "ECHO · DRAFTED",
  //                "TODAY'S NOTE", "MORNING THOUGHT".
  //   hookLabel: card 1's mono header. e.g. "WROTE IN YOUR VOICE",
  //              "QUICK REMINDER", "ON HONEST WORK".
  //   metaLabel: card 2's mono header. e.g. "POST PREVIEW",
  //              "BACKSTORY", "WHY IT MATTERS".
  //   closerLabel: card 3's mono header. e.g. "PUBLISHED",
  //                "SHARE THIS", "SAVE FOR LATER".
  statusLabel?: string;
  hookLabel?: string;
  metaLabel?: string;
  closerLabel?: string;
};

// Discriminator on the persisted `motion` field. Echo writes this to
// ContentDraft; the render API picks the composition by `template`.
export type MotionDirective =
  | { template: "quote"; content: QuoteContent; design?: VideoDesign }
  | { template: "stat"; content: StatContent; design?: VideoDesign }
  | { template: "list"; content: ListContent; design?: VideoDesign }
  | {
      template: "product-reveal";
      content: ProductRevealContent;
      design?: VideoDesign;
    }
  | {
      template: "carousel-as-reel";
      content: CarouselAsReelContent;
      design?: VideoDesign;
    };

// Output frame size. Reels and TikToks are vertical-first; we target
// 9:16 1080×1920 by default. The renderer can rescale to 1:1 (square
// feed posts) or 16:9 (YouTube Shorts) at composition selection time.
export type OutputFormat = "vertical" | "square" | "horizontal";

export const DIMENSIONS: Record<OutputFormat, { width: number; height: number }> = {
  vertical: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
  horizontal: { width: 1920, height: 1080 },
};
