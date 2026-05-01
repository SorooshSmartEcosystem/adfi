// InstagramPostMockup — square frame mimicking IG feed UI.
// Header (avatar + handle + ⋯ menu trigger), 1:1 image (or carousel
// scrubbed by prev/next arrows + dot indicator), action row,
// like-by line, caption with "…more" inline toggle, hashtags blue.

"use client";

import { useState } from "react";
import type { MockupProps } from "./types";
import { pickPrimaryText, truncate } from "./types";

export function InstagramPostMockup({
  business,
  content,
  menu,
}: MockupProps) {
  const handle =
    business.handle ?? business.name.toLowerCase().replace(/\s+/g, "_");
  const fullCaption = pickPrimaryText(content);
  const tags = content.hashtags ?? [];
  const [expanded, setExpanded] = useState(false);

  // Carousel: cycle through slides with prev/next arrows.
  const slides = content.slides ?? [];
  const isCarousel = slides.length > 1;
  const [slideIdx, setSlideIdx] = useState(0);
  const currentSlide = isCarousel ? slides[slideIdx] : null;
  const displayedImage =
    currentSlide?.imageUrl ?? content.imageUrl ?? slides[0]?.imageUrl;

  const TRUNC = 110;
  const isLong = fullCaption.length > TRUNC;
  const captionShown = expanded || !isLong ? fullCaption : truncate(fullCaption, TRUNC);

  return (
    <div className="bg-white border-hairline border-[#dbdbdb] rounded-md overflow-hidden max-w-[440px] w-full">
      {/* Header */}
      <div className="flex items-center gap-sm px-md py-sm relative">
        <Avatar business={business} />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-ink truncate">
            {handle}
          </div>
          <div className="text-[11px] text-ink4">just now</div>
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
        {menu?.open ? (
          <div className="absolute right-md top-full mt-xs z-30">
            {menu.content}
          </div>
        ) : null}
      </div>

      {/* Image / carousel */}
      <div className="relative aspect-square bg-surface flex items-center justify-center overflow-hidden">
        {displayedImage ? (
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
            {slideIdx < slides.length - 1 ? (
              <ArrowBtn
                direction="next"
                onClick={() =>
                  setSlideIdx((i) => Math.min(slides.length - 1, i + 1))
                }
              />
            ) : null}
            <div className="absolute top-md left-1/2 -translate-x-1/2 flex gap-xs">
              {slides.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    i === slideIdx ? "bg-white" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
            <div className="absolute top-md right-md font-mono text-[10px] tracking-[0.16em] text-white bg-black/45 backdrop-blur px-sm py-[2px] rounded-full">
              {slideIdx + 1}/{slides.length}
            </div>

            {/* Slide caption overlay (headline + body of the current slide) */}
            {currentSlide?.headline || currentSlide?.body ? (
              <div className="absolute bottom-0 left-0 right-0 p-md text-white pointer-events-none"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 100%)",
                }}
              >
                {currentSlide.headline ? (
                  <div className="text-[14px] font-semibold mb-xs leading-tight" dir="auto">
                    {currentSlide.headline}
                  </div>
                ) : null}
                {currentSlide.body ? (
                  <div className="text-[12px] leading-relaxed line-clamp-3" dir="auto">
                    {currentSlide.body}
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
