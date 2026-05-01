"use client";

// DraftCardV2 (revision 2) — minimal chrome. Just the mockup with a
// quiet status pill in the corner and a single ⋯ menu that holds
// every action. No more primary button + tertiary links — the user
// wanted all actions consolidated. Tap the mockup to expand the
// caption (show-more pattern). Carousel posts get prev/next arrows
// directly on the mockup.

import { useRef, useState } from "react";
import { trpc } from "../../lib/trpc";
import { PlatformMockup } from "./mockups";
import type { DraftContent } from "./mockups";
import { OrbLoader, STAGES_VIDEO_SCRIPT } from "../shared/orb-loader";
import { ScriptPreview } from "./script-preview";

type Draft = {
  id: string;
  platform: string;
  status: string;
  format?: string;
  content: unknown;
  alternateContent?: unknown;
  createdAt: Date;
  scheduledFor: Date | null;
  motion?: unknown;
};

type Business = {
  name: string;
  handle?: string;
  logoUrl?: string | null;
  initials: string;
};

type MotionState = {
  status?: "pending" | "rendering" | "ready" | "failed";
  mp4Url?: string;
  error?: string;
};

type ScriptForPreview = {
  scenes: { type: string; duration: number; [k: string]: unknown }[];
  design: Record<string, unknown>;
};

// Tiny status indicator. One word per state. No "needs your eyes"
// noise repeated above the card already.
function statusBlip(status: string): { text: string; color: string } {
  switch (status) {
    case "AWAITING_REVIEW":
      return { text: "review", color: "#D9A21C" };
    case "AWAITING_PHOTOS":
      return { text: "photos", color: "#D9A21C" };
    case "DRAFT":
      return { text: "draft", color: "#888" };
    case "APPROVED":
      return { text: "scheduled", color: "#3a9d5c" };
    case "PUBLISHED":
      return { text: "live", color: "#3a9d5c" };
    case "FAILED":
      return { text: "failed", color: "#C84A3E" };
    default:
      return { text: status.toLowerCase(), color: "#888" };
  }
}

export function DraftCardV2({
  draft,
  business,
  brandTokens,
}: {
  draft: Draft;
  business: Business;
  brandTokens?: Record<string, string>;
}) {
  const utils = trpc.useUtils();
  const [showMenu, setShowMenu] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [draftedScript, setDraftedScript] = useState<ScriptForPreview | null>(null);
  const menuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const motion = (draft.motion ?? null) as MotionState | null;
  const isVideoRendering = motion?.status === "rendering";
  const status = statusBlip(draft.status);

  const approve = trpc.content.approveDraft.useMutation({
    onSuccess: () => utils.content.listDrafts.invalidate(),
  });
  const reject = trpc.content.rejectDraft.useMutation({
    onSuccess: () => utils.content.listDrafts.invalidate(),
  });
  const regenerate = trpc.content.regenerateDraft.useMutation({
    onSuccess: () => utils.content.listDrafts.invalidate(),
  });
  const draftScript = trpc.motionReel.draftScript.useMutation({
    onSuccess: (s) => setDraftedScript(s as ScriptForPreview),
  });

  const isPending = approve.isPending || reject.isPending || regenerate.isPending;

  const rawContent = (draft.content ?? {}) as DraftContent & {
    slides?: { imageUrl?: string; headline?: string; body?: string }[];
    coverSlide?: { imageUrl?: string; headline?: string };
  };
  const platform = draft.platform as Parameters<typeof PlatformMockup>[0]["platform"];
  const format = (draft.format ?? "SINGLE_POST") as Parameters<
    typeof PlatformMockup
  >[0]["format"];

  // Carousel handling — the mockup gets one slide at a time. We thread
  // the current slide's image + headline through `imageUrl` + `caption`
  // so existing mockups don't need to know about carousels.
  const isCarousel = format === "CAROUSEL";
  type CarouselSlide = {
    imageUrl?: string;
    headline?: string;
    body?: string;
  };
  const slides: CarouselSlide[] = isCarousel
    ? [
        ...(rawContent.coverSlide ? [rawContent.coverSlide as CarouselSlide] : []),
        ...((rawContent.slides ?? []) as CarouselSlide[]),
      ]
    : [];
  const currentSlide =
    isCarousel && slides.length > 0 ? slides[carouselIdx] : null;
  const visibleContent: DraftContent =
    isCarousel && currentSlide
      ? {
          ...rawContent,
          imageUrl: currentSlide.imageUrl ?? rawContent.imageUrl,
          caption:
            currentSlide.headline ?? currentSlide.body ?? rawContent.caption,
        }
      : rawContent;

  // Show-more: caption is truncated unless `expanded` is set. We pass
  // the full caption to the mockup when expanded so user sees it all.
  const fullCaption = visibleContent.caption ?? visibleContent.body ?? "";
  const TRUNC = 140;
  const isLong = fullCaption.length > TRUNC;
  const displayedCaption = expanded || !isLong
    ? fullCaption
    : fullCaption.slice(0, TRUNC).trimEnd() + "…";

  const tokens = {
    bg: brandTokens?.bg ?? "#FAFAF7",
    surface: brandTokens?.surface ?? "#F2EFE5",
    surface2: brandTokens?.surface2 ?? "#F8F5EA",
    border: brandTokens?.border ?? "#E5E3DB",
    ink: brandTokens?.ink ?? "#111111",
    ink2: brandTokens?.ink2 ?? "#444444",
    ink3: brandTokens?.ink3 ?? "#666666",
    ink4: brandTokens?.ink4 ?? "#888888",
    alive: brandTokens?.alive ?? "#7CE896",
    aliveDark: brandTokens?.aliveDark ?? "#3A9D5C",
    attnBg: brandTokens?.attnBg ?? "#FFF9ED",
    attnBorder: brandTokens?.attnBorder ?? "#F0D98C",
    attnText: brandTokens?.attnText ?? "#8A6A1E",
    businessName: business.name,
  };

  // Close menu on blur — small delay so click handler runs first.
  function scheduleMenuClose() {
    if (menuTimerRef.current) clearTimeout(menuTimerRef.current);
    menuTimerRef.current = setTimeout(() => setShowMenu(false), 140);
  }

  return (
    <div className="bg-bg border-hairline border-border rounded-lg overflow-hidden flex flex-col">
      {/* Top bar — status pill + 3-dot menu */}
      <div className="flex items-center justify-between px-md py-xs border-b-hairline border-border2">
        <span
          className="font-mono text-[10px] tracking-[0.2em] uppercase"
          style={{ color: status.color }}
        >
          {status.text}
        </span>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu((v) => !v)}
            onBlur={scheduleMenuClose}
            disabled={isPending}
            className="text-ink3 hover:text-ink text-lg leading-none px-xs disabled:opacity-30"
            aria-label="actions"
          >
            ⋯
          </button>
          {showMenu ? (
            <div
              className="absolute right-0 top-full mt-xs bg-bg border-hairline border-border rounded-md p-xs z-20 min-w-[180px] shadow-lg"
              onMouseDown={(e) => e.preventDefault() /* keep menu open */}
            >
              {(draft.status === "AWAITING_REVIEW" ||
                draft.status === "DRAFT") ? (
                <>
                  <MenuItem
                    onClick={() => {
                      approve.mutate({ id: draft.id, variant: "primary" });
                      setShowMenu(false);
                    }}
                  >
                    approve
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      regenerate.mutate({ id: draft.id });
                      setShowMenu(false);
                    }}
                  >
                    regenerate
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      draftScript.mutate({ brief: textBrief(rawContent) });
                      setShowMenu(false);
                    }}
                  >
                    make video
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      navigator.clipboard.writeText(textBrief(rawContent));
                      setShowMenu(false);
                    }}
                  >
                    copy text
                  </MenuItem>
                  <MenuDivider />
                  <MenuItem
                    danger
                    onClick={() => {
                      reject.mutate({ id: draft.id });
                      setShowMenu(false);
                    }}
                  >
                    reject
                  </MenuItem>
                </>
              ) : null}
              {draft.status === "APPROVED" ? (
                <>
                  <MenuItem onClick={() => setShowMenu(false)}>
                    edit schedule
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      navigator.clipboard.writeText(textBrief(rawContent));
                      setShowMenu(false);
                    }}
                  >
                    copy text
                  </MenuItem>
                  <MenuDivider />
                  <MenuItem
                    danger
                    onClick={() => {
                      reject.mutate({ id: draft.id });
                      setShowMenu(false);
                    }}
                  >
                    unschedule
                  </MenuItem>
                </>
              ) : null}
              {draft.status === "PUBLISHED" ? (
                <>
                  <MenuItem onClick={() => setShowMenu(false)}>
                    view live ↗
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      navigator.clipboard.writeText(textBrief(rawContent));
                      setShowMenu(false);
                    }}
                  >
                    copy text
                  </MenuItem>
                </>
              ) : null}
              {draft.status === "FAILED" ? (
                <MenuItem
                  onClick={() => {
                    regenerate.mutate({ id: draft.id });
                    setShowMenu(false);
                  }}
                >
                  retry
                </MenuItem>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Mockup body */}
      <div
        className={`relative ${isPending ? "opacity-40 transition-opacity" : ""}`}
      >
        <PlatformMockup
          platform={platform}
          format={format}
          business={business}
          content={{ ...visibleContent, caption: displayedCaption }}
          mp4Url={motion?.mp4Url ?? null}
        />

        {/* Carousel prev/next arrows */}
        {isCarousel && slides.length > 1 ? (
          <>
            <CarouselArrow
              direction="prev"
              disabled={carouselIdx === 0}
              onClick={() => setCarouselIdx((i) => Math.max(0, i - 1))}
            />
            <CarouselArrow
              direction="next"
              disabled={carouselIdx === slides.length - 1}
              onClick={() =>
                setCarouselIdx((i) => Math.min(slides.length - 1, i + 1))
              }
            />
            <div className="absolute top-md left-1/2 -translate-x-1/2 flex gap-xs">
              {slides.map((_, i) => (
                <span
                  key={i}
                  className={`w-1 h-1 rounded-full ${
                    i === carouselIdx ? "bg-white" : "bg-white/40"
                  }`}
                />
              ))}
            </div>
          </>
        ) : null}

        {/* Show-more link — quiet, only when caption truncated */}
        {isLong ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="absolute bottom-md right-md font-mono text-[10px] text-ink4 hover:text-ink bg-bg/85 backdrop-blur px-sm py-[2px] rounded-full"
          >
            {expanded ? "show less" : "show more"}
          </button>
        ) : null}
      </div>

      {/* Inline render-progress strip */}
      {isVideoRendering ? (
        <div className="border-t-hairline border-border2 py-sm flex items-center justify-center">
          <OrbLoader tone="alive" size="sm" stages={STAGES_VIDEO_SCRIPT} />
        </div>
      ) : null}

      {/* Inline error strip */}
      {(approve.error || reject.error || regenerate.error || draftScript.error) ? (
        <div className="px-md py-xs font-mono text-[11px] text-urgent border-t-hairline border-border2">
          {approve.error?.message ??
            reject.error?.message ??
            regenerate.error?.message ??
            draftScript.error?.message}
        </div>
      ) : null}

      {draftedScript ? (
        <ScriptPreview
          draftId={draft.id}
          script={draftedScript}
          tokens={tokens}
          onClose={() => setDraftedScript(null)}
          onRendered={() => {
            setDraftedScript(null);
            utils.content.listDrafts.invalidate();
          }}
        />
      ) : null}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full text-left text-xs px-sm py-[7px] rounded ${
        danger
          ? "text-urgent hover:bg-urgent/10"
          : "text-ink2 hover:bg-surface"
      }`}
    >
      {children}
    </button>
  );
}

function MenuDivider() {
  return <div className="my-xs h-px bg-border" />;
}

function CarouselArrow({
  direction,
  onClick,
  disabled,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`absolute top-1/2 -translate-y-1/2 ${
        direction === "prev" ? "left-md" : "right-md"
      } w-9 h-9 rounded-full bg-white/90 backdrop-blur text-ink shadow-md flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-colors`}
      aria-label={direction === "prev" ? "previous slide" : "next slide"}
    >
      {direction === "prev" ? "‹" : "›"}
    </button>
  );
}

function textBrief(content: DraftContent): string {
  const parts = [
    content.hook,
    content.caption ?? content.body,
    content.subject,
    content.hashtags && content.hashtags.length > 0
      ? content.hashtags.join(" ")
      : null,
  ].filter(Boolean);
  return parts.join("\n\n");
}
