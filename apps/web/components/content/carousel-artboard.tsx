"use client";

import { useEffect, useRef, useState } from "react";

// Designed 1:1 slide renderer. Each slide picks a template + palette and
// gets typography treatment matching what a designer would actually ship —
// not text-in-a-box. Square aspect ratio, large type, generous whitespace.

type Palette = "ink" | "cream" | "white" | "alive" | "attn";
type Template =
  | "cover"
  | "quote"
  | "numbered"
  | "statement"
  | "image_cue"
  | "list"
  | "closer";

const PALETTE_CLS: Record<Palette, string> = {
  ink: "bg-ink text-white",
  cream: "bg-surface text-ink",
  white: "bg-white text-ink",
  alive: "bg-surface text-ink",
  attn: "bg-attentionBg text-ink",
};

const PALETTE_ACCENT: Record<Palette, string> = {
  ink: "bg-alive",
  cream: "bg-ink",
  white: "bg-ink",
  alive: "bg-aliveDark",
  attn: "bg-attentionBorder",
};

const PALETTE_MUTED: Record<Palette, string> = {
  ink: "text-white/60",
  cream: "text-ink3",
  white: "text-ink3",
  alive: "text-aliveDark",
  attn: "text-attentionText",
};

type CoverSlide = {
  palette?: Palette;
  title: string;
  subtitle: string | null;
  visualDirection?: string;
  imageUrl?: string | null;
};

type BodySlide = {
  template?: Template;
  palette?: Palette;
  headline: string;
  body: string;
  number: string | null;
  quoteAttribution: string | null;
  bulletPoints: string[] | null;
  visualDirection: string;
  imageUrl?: string | null;
};

type CloserSlide = {
  palette?: Palette;
  title: string;
  body: string;
  cta: string | null;
};

function ArtboardWrap({
  index,
  total,
  label,
  palette,
  children,
  visualDirection,
}: {
  index: number;
  total: number;
  label: string;
  palette: Palette;
  children: React.ReactNode;
  visualDirection?: string;
}) {
  return (
    <div className="flex flex-col">
      <div
        className={`relative aspect-square rounded-[16px] overflow-hidden border-hairline border-border shadow-[0_4px_24px_rgba(0,0,0,0.06)] ${PALETTE_CLS[palette]}`}
      >
        <div className="absolute top-md left-md flex items-center gap-sm">
          <span
            className={`w-[6px] h-[6px] rounded-full ${PALETTE_ACCENT[palette]}`}
          />
          <span
            className={`font-mono text-[10px] tracking-[0.2em] ${PALETTE_MUTED[palette]}`}
          >
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
        </div>
        <div className="absolute top-md right-md">
          <span
            className={`font-mono text-[10px] tracking-[0.2em] ${PALETTE_MUTED[palette]}`}
          >
            {label}
          </span>
        </div>
        <div className="absolute inset-0 px-[28px] py-[60px] flex flex-col justify-center">
          {children}
        </div>
      </div>
      {visualDirection ? (
        <p className="font-mono text-[10px] text-ink4 mt-sm italic leading-relaxed" dir="auto">
          📷 {visualDirection}
        </p>
      ) : null}
    </div>
  );
}

function CoverSlideView({
  slide,
  index,
  total,
}: {
  slide: CoverSlide;
  index: number;
  total: number;
}) {
  const palette = slide.palette ?? "ink";
  return (
    <ArtboardWrap
      index={index}
      total={total}
      label="COVER"
      palette={palette}
      visualDirection={slide.visualDirection}
    >
      {slide.imageUrl ? (
        <>
          <img
            src={slide.imageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/45" />
          <div className="relative text-white">
            <h3
              className="font-medium tracking-[-0.025em] leading-[1.05]"
              style={{ fontSize: "clamp(20px, 4vw, 32px)" }}
            dir="auto">
              {slide.title}
            </h3>
            {slide.subtitle ? (
              <p className="text-sm mt-md leading-relaxed text-white/80" dir="auto">
                {slide.subtitle}
              </p>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <h3
            className="font-medium tracking-[-0.025em] leading-[1.05]"
            style={{ fontSize: "clamp(20px, 4vw, 32px)" }}
          dir="auto">
            {slide.title}
          </h3>
          {slide.subtitle ? (
            <p className={`text-sm mt-md leading-relaxed ${PALETTE_MUTED[palette]}`}>
              {slide.subtitle}
            </p>
          ) : null}
        </>
      )}
    </ArtboardWrap>
  );
}

function BodySlideView({
  slide,
  index,
  total,
}: {
  slide: BodySlide;
  index: number;
  total: number;
}) {
  const palette = slide.palette ?? "cream";
  const template = slide.template ?? "numbered";

  if (template === "quote") {
    return (
      <ArtboardWrap
        index={index}
        total={total}
        label="QUOTE"
        palette={palette}
        visualDirection={slide.visualDirection}
      >
        <div
          className={`text-[clamp(18px,3.5vw,28px)] font-medium leading-[1.2] tracking-tight`}
        >
          “{slide.headline}”
        </div>
        {slide.quoteAttribution ? (
          <div className={`font-mono text-xs mt-md ${PALETTE_MUTED[palette]}`}>
            — {slide.quoteAttribution}
          </div>
        ) : null}
      </ArtboardWrap>
    );
  }

  if (template === "statement") {
    return (
      <ArtboardWrap
        index={index}
        total={total}
        label="STATEMENT"
        palette={palette}
        visualDirection={slide.visualDirection}
      >
        <div
          className="font-medium tracking-tight leading-[1.15]"
          style={{ fontSize: "clamp(22px, 4.5vw, 36px)" }}
        dir="auto">
          {slide.headline}
        </div>
      </ArtboardWrap>
    );
  }

  if (template === "image_cue") {
    return (
      <ArtboardWrap
        index={index}
        total={total}
        label="IMAGE"
        palette={palette}
        visualDirection={slide.visualDirection}
      >
        {slide.imageUrl ? (
          <img
            src={slide.imageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-md rounded-md border border-dashed border-current opacity-30 flex items-center justify-center">
            <div className={`text-center px-md ${PALETTE_MUTED[palette]}`}>
              <div className="font-mono text-[10px] tracking-[0.2em] mb-xs" dir="auto">
                PHOTO
              </div>
              <div className="text-sm leading-snug italic" dir="auto">
                {slide.visualDirection.slice(0, 100)}
              </div>
            </div>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-[28px] bg-black/55 text-white">
          <div className="text-base font-medium leading-tight" dir="auto">
            {slide.headline}
          </div>
          {slide.body ? (
            <div className="text-sm mt-xs text-white/80" dir="auto">{slide.body}</div>
          ) : null}
        </div>
      </ArtboardWrap>
    );
  }

  if (template === "list") {
    const bullets = slide.bulletPoints ?? [];
    return (
      <ArtboardWrap
        index={index}
        total={total}
        label="LIST"
        palette={palette}
        visualDirection={slide.visualDirection}
      >
        <div className="text-lg font-medium tracking-tight mb-md leading-tight" dir="auto">
          {slide.headline}
        </div>
        <div className="flex flex-col gap-sm">
          {bullets.map((b, i) => (
            <div key={i} className="flex items-start gap-sm">
              <span
                className={`w-[6px] h-[6px] rounded-full mt-[10px] ${PALETTE_ACCENT[palette]}`}
              />
              <span className="text-sm leading-relaxed" dir="auto">{b}</span>
            </div>
          ))}
        </div>
      </ArtboardWrap>
    );
  }

  // numbered (default)
  return (
    <ArtboardWrap
      index={index}
      total={total}
      label="STEP"
      palette={palette}
      visualDirection={slide.visualDirection}
    >
      <div
        className="font-mono font-medium opacity-30 leading-none mb-md"
        style={{ fontSize: "clamp(48px, 10vw, 88px)" }}
      dir="auto">
        {slide.number ?? String(index).padStart(2, "0")}
      </div>
      <div className="text-lg font-medium tracking-tight leading-tight mb-sm" dir="auto">
        {slide.headline}
      </div>
      {slide.body ? (
        <div className={`text-sm leading-relaxed ${PALETTE_MUTED[palette]}`}>
          {slide.body}
        </div>
      ) : null}
    </ArtboardWrap>
  );
}

function CloserSlideView({
  slide,
  index,
  total,
}: {
  slide: CloserSlide;
  index: number;
  total: number;
}) {
  const palette = slide.palette ?? "ink";
  return (
    <ArtboardWrap
      index={index}
      total={total}
      label="CLOSER"
      palette={palette}
    >
      <div className="text-lg font-medium tracking-tight leading-tight mb-md" dir="auto">
        {slide.title}
      </div>
      <div className={`text-sm leading-relaxed mb-md ${PALETTE_MUTED[palette]}`}>
        {slide.body}
      </div>
      {slide.cta ? (
        <div
          className={`inline-flex items-center gap-sm font-mono text-xs tracking-[0.1em] mt-md ${PALETTE_MUTED[palette]}`}
        >
          <span
            className={`w-[8px] h-[8px] rounded-full ${PALETTE_ACCENT[palette]}`}
          />
          {slide.cta}
        </div>
      ) : null}
    </ArtboardWrap>
  );
}

export function CarouselArtboard({
  cover,
  body,
  closer,
}: {
  cover: CoverSlide;
  body: BodySlide[];
  closer: CloserSlide;
}) {
  const total = 1 + body.length + 1;
  const slides = [
    <CoverSlideView key="cover" slide={cover} index={0} total={total} />,
    ...body.map((s, i) => (
      <BodySlideView key={`b-${i}`} slide={s} index={i + 1} total={total} />
    )),
    <CloserSlideView
      key="closer"
      slide={closer}
      index={total - 1}
      total={total}
    />,
  ];

  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // Sync the active dot with whatever the scroll-snap container settles on
  // (covers swipe + click + keyboard).
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let raf = 0;
    const handler = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const w = el.clientWidth;
        const idx = Math.round(el.scrollLeft / w);
        setActive(Math.max(0, Math.min(slides.length - 1, idx)));
      });
    };
    el.addEventListener("scroll", handler, { passive: true });
    return () => {
      el.removeEventListener("scroll", handler);
      cancelAnimationFrame(raf);
    };
  }, [slides.length]);

  function go(idx: number) {
    const el = trackRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(slides.length - 1, idx));
    el.scrollTo({ left: el.clientWidth * clamped, behavior: "smooth" });
  }

  return (
    <div>
      <div
        ref={trackRef}
        className="flex overflow-x-auto snap-x snap-mandatory rounded-[18px] -mx-md px-md scrollbar-thin"
        style={{ scrollbarWidth: "none" }}
        aria-roledescription="carousel"
      >
        <style>{`.scrollbar-thin::-webkit-scrollbar{display:none}`}</style>
        {slides.map((s, i) => (
          <div
            key={i}
            className="snap-center shrink-0 w-full pr-md last:pr-0"
            aria-roledescription="slide"
            aria-label={`slide ${i + 1} of ${slides.length}`}
          >
            <div className="max-w-[460px] mx-auto">{s}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-md">
        <div className="flex items-center gap-[6px]">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`go to slide ${i + 1}`}
              className={`h-[6px] rounded-full transition-all ${
                i === active ? "w-[18px] bg-ink" : "w-[6px] bg-border"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-sm">
          <span className="text-xs text-ink4 tabular-nums">
            {active + 1} / {slides.length}
          </span>
          <button
            type="button"
            onClick={() => go(active - 1)}
            disabled={active === 0}
            aria-label="previous slide"
            className="w-7 h-7 flex items-center justify-center rounded-full border-hairline border-border text-ink2 hover:border-ink hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => go(active + 1)}
            disabled={active === slides.length - 1}
            aria-label="next slide"
            className="w-7 h-7 flex items-center justify-center rounded-full border-hairline border-border text-ink2 hover:border-ink hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
