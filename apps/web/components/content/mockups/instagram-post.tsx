// InstagramPostMockup — square frame mimicking IG feed UI.
// Header (avatar + handle + ⋯ menu trigger), 1:1 image (or carousel
// scrubbed by prev/next arrows + dot indicator), action row,
// like-by line, caption with "…more" inline toggle, hashtags blue.

"use client";

import { useState } from "react";
import type { MockupProps } from "./types";
import { pickPrimaryText, truncate, formatPostedAt } from "./types";
import {
  CoverSlideView,
  BodySlideView,
  CloserSlideView,
} from "../carousel-artboard";

export function InstagramPostMockup({
  business,
  content,
  menu,
  postedAt,
}: MockupProps) {
  const handle =
    business.handle ?? business.name.toLowerCase().replace(/\s+/g, "_");
  const fullCaption = pickPrimaryText(content);
  const tags = content.hashtags ?? [];
  const [expanded, setExpanded] = useState(false);

  // Carousel: prefer the rich `carousel` shape (designed slides per
  // template/palette) when available. Fall back to the flat slides[]
  // for legacy drafts.
  const richCarousel = content.carousel;
  const richSlideCount = richCarousel
    ? 1 + richCarousel.body.length + 1
    : 0;
  const flatSlides = content.slides ?? [];
  const isCarousel = richCarousel
    ? richSlideCount > 1
    : flatSlides.length > 1;
  const slideCount = richCarousel ? richSlideCount : flatSlides.length;
  const [slideIdx, setSlideIdx] = useState(0);
  const currentFlatSlide = !richCarousel && isCarousel ? flatSlides[slideIdx] : null;
  const displayedImage =
    currentFlatSlide?.imageUrl ?? content.imageUrl ?? flatSlides[0]?.imageUrl;

  const TRUNC = 110;
  const isLong = fullCaption.length > TRUNC;
  const captionShown = expanded || !isLong ? fullCaption : truncate(fullCaption, TRUNC);

  return (
    <div className="bg-white border-hairline border-[#dbdbdb] rounded-md overflow-hidden max-w-[440px] w-full">
      {/* Header */}
      <div className="flex items-center gap-sm px-md py-sm">
        <Avatar business={business} />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-ink truncate">
            {handle}
          </div>
          <div className="text-[11px] text-ink4">
            {formatPostedAt(postedAt, "instagram")}
          </div>
        </div>
        <button
          type="button"
          onClick={menu?.onToggle}
          disabled={!menu}
          className="text-ink2 hover:text-ink text-xl leading-none px-xs disabled:opacity-30 disabled:cursor-default"
          aria-label="post actions"
        >
          ⋯
        </button>
      </div>

      {/* Image / carousel */}
      <div className="relative aspect-square bg-surface flex items-center justify-center overflow-hidden">
        {richCarousel ? (
          // Rich carousel — render the actual designed slide for the
          // current index. Cover (idx 0), body (1..n), closer (last).
          <RichCarouselSlide
            carousel={richCarousel}
            index={slideIdx}
            total={richSlideCount}
          />
        ) : displayedImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayedImage}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-xs text-ink4">
            <div className="font-mono text-[10px] tracking-[0.2em]">
              IMAGE PENDING
            </div>
            <div className="text-[11px]">echo will draw this once approved</div>
          </div>
        )}

        {/* Carousel UI overlays */}
        {isCarousel ? (
          <>
            {slideIdx > 0 ? (
              <ArrowBtn
                direction="prev"
                onClick={() => setSlideIdx((i) => Math.max(0, i - 1))}
              />
            ) : null}
            {slideIdx < slideCount - 1 ? (
              <ArrowBtn
                direction="next"
                onClick={() =>
                  setSlideIdx((i) => Math.min(slideCount - 1, i + 1))
                }
              />
            ) : null}
            <div className="absolute top-md left-1/2 -translate-x-1/2 flex gap-xs">
              {Array.from({ length: slideCount }).map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    i === slideIdx ? "bg-white" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
            <div className="absolute top-md right-md font-mono text-[10px] tracking-[0.16em] text-white bg-black/45 backdrop-blur px-sm py-[2px] rounded-full">
              {slideIdx + 1}/{slideCount}
            </div>

            {/* Legacy flat-slide overlay caption — only for non-rich
                carousels (rich carousels render text inside each
                designed slide). */}
            {!richCarousel && (currentFlatSlide?.headline || currentFlatSlide?.body) ? (
              <div className="absolute bottom-0 left-0 right-0 p-md text-white pointer-events-none"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 100%)",
                }}
              >
                {currentFlatSlide.headline ? (
                  <div className="text-[14px] font-semibold mb-xs leading-tight" dir="auto">
                    {currentFlatSlide.headline}
                  </div>
                ) : null}
                {currentFlatSlide.body ? (
                  <div className="text-[12px] leading-relaxed line-clamp-3" dir="auto">
                    {currentFlatSlide.body}
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {/* Action row */}
      <div className="flex items-center gap-md px-md pt-sm pb-xs text-ink2">
        <IgIcon path="M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z" />
        <IgIcon path="M21 11.5a8.4 8.4 0 01-1.3 4.5L21 21l-5-1.3a8.5 8.5 0 11-3-15.7 8.4 8.4 0 018 7.5z" />
        <IgIcon path="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
        <span className="ml-auto" />
        <IgIcon path="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
      </div>

      {/* Likes */}
      <div className="px-md text-[13px] font-semibold text-ink">
        liked by jane and 47 others
      </div>

      {/* Caption with inline …more */}
      <div className="px-md pt-xs pb-sm text-[13px] leading-relaxed text-ink whitespace-pre-wrap" dir="auto">
        <span className="font-semibold mr-xs">{handle}</span>
        {captionShown}
        {isLong && !expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-ink4 hover:text-ink2 ml-xs"
          >
            more
          </button>
        ) : null}
        {tags.length > 0 ? (
          <div className="text-[#385898] mt-xs">
            {tags
              .slice(0, 8)
              .map((t) => (t.startsWith("#") ? t : `#${t}`))
              .join(" ")}
          </div>
        ) : null}
      </div>

      {/* Comments hint */}
      <div className="px-md pb-md text-[12px] text-ink4">
        view all 3 comments
      </div>
    </div>
  );
}

function Avatar({ business }: { business: MockupProps["business"] }) {
  if (business.logoUrl) {
    return (
      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-pink-500/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={business.logoUrl}
          alt=""
          className="w-full h-full object-cover"
        />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center flex-shrink-0 text-[10px] font-medium text-ink2">
      {business.initials}
    </div>
  );
}

function IgIcon({ path }: { path: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}

// Renders the right designed slide (cover / body[i] / closer) for a
// given index. Picks the slide view in feed mode (no shadow / hairline
// / visualDirection caption — the IG mockup chrome already provides
// the framing).
function RichCarouselSlide({
  carousel,
  index,
  total,
}: {
  carousel: NonNullable<MockupProps["content"]["carousel"]>;
  index: number;
  total: number;
}) {
  const bodyCount = carousel.body.length;
  const isCover = index === 0;
  const isCloser = index === total - 1 && bodyCount > 0;
  // Edge case: no body slides — index 1 should fall back to closer.
  const closerOnly = bodyCount === 0 && index === 1;

  if (isCover) {
    return (
      <CoverSlideView
        slide={{
          palette: (carousel.cover.palette ?? "ink") as never,
          title: carousel.cover.title,
          subtitle: carousel.cover.subtitle ?? null,
          visualDirection: carousel.cover.visualDirection,
          imageUrl: carousel.cover.imageUrl ?? null,
        }}
        index={index}
        total={total}
        mode="feed"
      />
    );
  }
  if (isCloser || closerOnly) {
    return (
      <CloserSlideView
        slide={{
          palette: (carousel.closer.palette ?? "ink") as never,
          title: carousel.closer.title,
          body: carousel.closer.body,
          cta: carousel.closer.cta ?? null,
        }}
        index={index}
        total={total}
        mode="feed"
      />
    );
  }
  const bodyIdx = index - 1;
  const slide = carousel.body[bodyIdx];
  if (!slide) return null;
  return (
    <BodySlideView
      slide={{
        template: (slide.template ?? "numbered") as never,
        palette: (slide.palette ?? "cream") as never,
        headline: slide.headline,
        body: slide.body,
        number: slide.number ?? null,
        quoteAttribution: slide.quoteAttribution ?? null,
        bulletPoints: slide.bulletPoints ?? null,
        visualDirection: slide.visualDirection ?? "",
        imageUrl: slide.imageUrl ?? null,
      }}
      index={index}
      total={total}
      mode="feed"
    />
  );
}

function ArrowBtn({
  direction,
  onClick,
}: {
  direction: "prev" | "next";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute top-1/2 -translate-y-1/2 ${
        direction === "prev" ? "left-sm" : "right-sm"
      } w-7 h-7 rounded-full bg-white/90 backdrop-blur text-ink shadow-md flex items-center justify-center hover:bg-white transition-colors text-sm`}
      aria-label={direction === "prev" ? "previous slide" : "next slide"}
    >
      {direction === "prev" ? "‹" : "›"}
    </button>
  );
}
