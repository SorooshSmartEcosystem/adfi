// Normalizes Echo's per-format draft content shape into the flat
// DraftContent shape mockups consume. Echo emits one of:
//
//   SINGLE_POST       { hook, body, cta, hashtags, heroImage: {url} }
//   CAROUSEL          { coverSlide, bodySlides[], closerSlide,
//                       caption, hashtags }
//                     (each slide may carry imageUrl backfilled by
//                     image pipeline)
//   REEL_SCRIPT       { hook, beats[], caption, hashtags }
//   EMAIL_NEWSLETTER  { subject, preheader, sections[], cta: {label},
//                       heroImage: {url} }
//   STORY_SEQUENCE    { frames[] }
//
// Without normalization, mockups would have to know all 5 shapes and
// every render path would be a switch statement. This collapses them
// once at the boundary.

import type { DraftContent } from "./types";

type RawContent = Record<string, unknown>;

export function normalizeContent(
  raw: unknown,
  format: string,
): DraftContent {
  if (!raw || typeof raw !== "object") return {};
  const c = raw as RawContent;

  switch (format) {
    case "CAROUSEL":
      return normalizeCarousel(c);
    case "REEL_SCRIPT":
      return normalizeReel(c);
    case "EMAIL_NEWSLETTER":
      return normalizeEmail(c);
    case "STORY_SEQUENCE":
      return normalizeStory(c);
    case "SINGLE_POST":
    default:
      return normalizeSinglePost(c);
  }
}

function pickHero(c: RawContent): string | undefined {
  // heroImage is the post-generation backfill shape: { url, model }
  const hero = c.heroImage as { url?: string } | undefined;
  if (hero?.url) return hero.url;
  // Some legacy drafts may have a top-level imageUrl
  if (typeof c.imageUrl === "string") return c.imageUrl;
  return undefined;
}

function pickHashtags(c: RawContent): string[] | undefined {
  if (Array.isArray(c.hashtags))
    return c.hashtags.filter((t): t is string => typeof t === "string");
  return undefined;
}

function normalizeSinglePost(c: RawContent): DraftContent {
  // Caption = hook + body if both exist, else whichever does. Most IG
  // posts lead with the hook on its own line then the body — that
  // matches what the user actually sees in their feed.
  const hook = typeof c.hook === "string" ? c.hook : undefined;
  const body = typeof c.body === "string" ? c.body : undefined;
  const caption =
    hook && body
      ? `${hook}\n\n${body}`
      : hook ?? body ?? (typeof c.caption === "string" ? c.caption : undefined);
  return {
    hook,
    body,
    caption,
    imageUrl: pickHero(c),
    hashtags: pickHashtags(c),
  };
}

function normalizeCarousel(c: RawContent): DraftContent {
  const cover = (c.coverSlide as Record<string, unknown> | undefined) ?? {};
  const rawBody = Array.isArray(c.bodySlides)
    ? (c.bodySlides as Array<Record<string, unknown>>)
    : [];
  const closer = (c.closerSlide as Record<string, unknown> | undefined) ?? {};

  const coverSlide = {
    palette: typeof cover.palette === "string" ? cover.palette : undefined,
    title: typeof cover.title === "string" ? cover.title : "",
    subtitle:
      typeof cover.subtitle === "string"
        ? cover.subtitle
        : cover.subtitle === null
          ? null
          : null,
    visualDirection:
      typeof cover.visualDirection === "string"
        ? cover.visualDirection
        : undefined,
    imageUrl:
      typeof cover.imageUrl === "string"
        ? cover.imageUrl
        : cover.imageUrl === null
          ? null
          : null,
  };

  const bodySlides = rawBody.map((s) => ({
    template: typeof s.template === "string" ? s.template : undefined,
    palette: typeof s.palette === "string" ? s.palette : undefined,
    headline: typeof s.headline === "string" ? s.headline : "",
    body: typeof s.body === "string" ? s.body : "",
    number: typeof s.number === "string" ? s.number : null,
    quoteAttribution:
      typeof s.quoteAttribution === "string" ? s.quoteAttribution : null,
    bulletPoints: Array.isArray(s.bulletPoints)
      ? (s.bulletPoints as string[])
      : null,
    visualDirection:
      typeof s.visualDirection === "string" ? s.visualDirection : "",
    imageUrl:
      typeof s.imageUrl === "string"
        ? s.imageUrl
        : s.imageUrl === null
          ? null
          : null,
  }));

  const closerSlide = {
    palette: typeof closer.palette === "string" ? closer.palette : undefined,
    title: typeof closer.title === "string" ? closer.title : "",
    body: typeof closer.body === "string" ? closer.body : "",
    cta: typeof closer.cta === "string" ? closer.cta : null,
  };

  // Flat slides array — kept so anything that just needs a thumbnail
  // doesn't have to know about the rich shape.
  const slides = [
    {
      imageUrl: coverSlide.imageUrl ?? undefined,
      headline: coverSlide.title,
      body: coverSlide.subtitle ?? undefined,
    },
    ...bodySlides.map((s) => ({
      imageUrl: s.imageUrl ?? undefined,
      headline: s.headline,
      body: s.body,
    })),
    {
      imageUrl: coverSlide.imageUrl ?? undefined,
      headline: closerSlide.title,
      body: closerSlide.body,
    },
  ];

  return {
    caption:
      typeof c.caption === "string" ? c.caption : coverSlide.title || undefined,
    imageUrl: coverSlide.imageUrl ?? slides[0]?.imageUrl,
    slides,
    carousel: {
      cover: coverSlide,
      body: bodySlides,
      closer: closerSlide,
    },
    hashtags: pickHashtags(c),
  };
}

function normalizeReel(c: RawContent): DraftContent {
  const hook = typeof c.hook === "string" ? c.hook : undefined;
  return {
    hook,
    caption: typeof c.caption === "string" ? c.caption : hook,
    hashtags: pickHashtags(c),
    scenes: Array.isArray(c.beats) ? c.beats : undefined,
  };
}

function normalizeEmail(c: RawContent): DraftContent {
  const sections = Array.isArray(c.sections)
    ? (c.sections as Array<{ heading?: string | null; body?: string }>).map(
        (s) => ({
          heading: s.heading ?? undefined,
          body: s.body ?? "",
        }),
      )
    : [];
  // Concatenated body for any mockup that just wants flat text
  const body = sections
    .map((s) => (s.heading ? `${s.heading}\n${s.body}` : s.body))
    .join("\n\n");
  const cta = c.cta as { label?: string; link?: string | null } | undefined;
  return {
    subject: typeof c.subject === "string" ? c.subject : undefined,
    preheader: typeof c.preheader === "string" ? c.preheader : undefined,
    sections,
    body,
    caption: body,
    cta: cta?.label ? { label: cta.label, link: cta.link ?? null } : null,
    imageUrl: pickHero(c),
  };
}

function normalizeStory(c: RawContent): DraftContent {
  const frames = Array.isArray(c.frames)
    ? (c.frames as Array<{ text?: string; imageUrl?: string }>)
    : [];
  return {
    caption: frames.map((f) => f.text ?? "").join("\n\n"),
    imageUrl: frames[0]?.imageUrl,
    slides: frames.map((f) => ({
      imageUrl: f.imageUrl,
      body: f.text,
    })),
  };
}
