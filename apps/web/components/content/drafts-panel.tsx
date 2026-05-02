"use client";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { DraftCardV2 } from "./draft-card-v2";
import { FilterButton } from "./filter-button";
import type { PlatformValue } from "./platform-filter";

// DraftsPanel (revision 2) — minimal feed.
//   - Filter is a single funnel-icon button at the right edge,
//     popover with platform options (no big row of chips).
//   - Cards render in a 2-column grid on desktop, single column on
//     mobile. AWAITING_REVIEW + APPROVED merged into one feed sorted
//     by createdAt desc — no group labels, no status counts.
//   - Empty state is a single quiet line.

type StatusBucket = "ALL" | "REVIEW" | "SCHEDULED" | "LIVE";

export function DraftsPanel() {
  const [filter, setFilter] = useState<PlatformValue>("ALL");
  const [view, setView] = useState<"mockup" | "list">("mockup");
  const [bucket, setBucket] = useState<StatusBucket>("ALL");

  const platformArg =
    filter === "ALL"
      ? undefined
      : (filter as Exclude<PlatformValue, "ALL">);

  // Bucket → DraftStatus. We filter client-side after fetching so all
  // status counts are visible without re-fetching when the user
  // changes the bucket.
  const statusForBucket: Record<StatusBucket, string[] | null> = {
    ALL: null,
    REVIEW: ["AWAITING_REVIEW", "DRAFT", "AWAITING_PHOTOS"],
    SCHEDULED: ["APPROVED"],
    LIVE: ["PUBLISHED"],
  };

  // Fetch awaiting + approved + published together so all buckets are
  // populated from a single query. Bucket switching is a client-side
  // filter, so it's instant.
  const drafts = trpc.content.listDrafts.useQuery(
    {
      limit: 60,
      platform: platformArg,
    },
    {
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
      // Poll every 8s if any draft is still waiting on images. Image
      // backfill runs in the background after generate returns, so
      // images flow in over the next 30-90s without us blocking the
      // response — but the UI needs to refetch to actually see them.
      // Once everything is settled, polling stops.
      refetchInterval: (query) => {
        const items = query.state.data?.items ?? [];
        const hasPendingImages = items.some(hasMissingImages);
        return hasPendingImages ? 8000 : false;
      },
    },
  );

  const me = trpc.user.me.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const businessQuery = trpc.business.getActive.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const allItems = drafts.data?.items ?? [];
  const allowedStatuses = statusForBucket[bucket];
  const items = allowedStatuses
    ? allItems.filter((d) => allowedStatuses.includes(d.status))
    : allItems;
  const counts = {
    ALL: allItems.length,
    REVIEW: allItems.filter((d) =>
      statusForBucket.REVIEW!.includes(d.status),
    ).length,
    SCHEDULED: allItems.filter((d) =>
      statusForBucket.SCHEDULED!.includes(d.status),
    ).length,
    LIVE: allItems.filter((d) => statusForBucket.LIVE!.includes(d.status))
      .length,
  };

  const business = {
    name: businessQuery.data?.name ?? me.data?.businessName ?? "your business",
    handle: (businessQuery.data?.name ?? me.data?.businessName ?? "you")
      .toLowerCase()
      .replace(/\s+/g, "_"),
    logoUrl: businessQuery.data?.logoUrl ?? null,
    initials: initialsFor(
      businessQuery.data?.name ?? me.data?.businessName ?? "Y",
    ),
  };

  return (
    <div className="flex flex-col gap-md">
      {/* Toolbar — view toggle + status buckets (left) + filter (right) */}
      <div className="flex items-center justify-between gap-md flex-wrap">
        <div className="flex items-center gap-md flex-wrap">
          <ViewToggle value={view} onChange={setView} />
          <StatusBuckets value={bucket} onChange={setBucket} counts={counts} />
        </div>
        <FilterButton value={filter} onChange={setFilter} />
      </div>

      <div className="mt-md">
        {drafts.isLoading ? (
          <p className="text-sm text-ink3 py-lg" dir="auto">one second</p>
        ) : items.length === 0 ? (
          <div className="bg-surface rounded-md p-lg">
            <p className="text-md leading-relaxed" dir="auto">
              {bucket === "LIVE"
                ? "no live posts yet — approve a draft and it'll appear here once published."
                : bucket === "SCHEDULED"
                  ? "nothing scheduled — approve a draft to queue it."
                  : bucket === "REVIEW"
                    ? "nothing waiting — tap draft post to ask echo for one."
                    : "inbox zero — nothing here yet. tap draft post at the top to ask echo for one."}
            </p>
          </div>
        ) : view === "list" ? (
          <div className="flex flex-col gap-sm">
            {items.map((d) => (
              // id="d-<draftId>" lets the calendar's chip-links scroll
              // straight to the card (`/content?tab=feed#d-X`).
              <div key={d.id} id={`d-${d.id}`}>
                <DraftCardV2 draft={d} business={business} view="list" />
              </div>
            ))}
          </div>
        ) : (
          <div className="columns-1 md:columns-2 gap-lg w-full">
            {items.map((d) => (
              <div
                key={d.id}
                id={`d-${d.id}`}
                className="break-inside-avoid mb-lg w-full max-w-full overflow-hidden"
              >
                <DraftCardV2 draft={d} business={business} view="mockup" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBuckets({
  value,
  onChange,
  counts,
}: {
  value: StatusBucket;
  onChange: (v: StatusBucket) => void;
  counts: Record<StatusBucket, number>;
}) {
  const buckets: { value: StatusBucket; label: string }[] = [
    { value: "ALL", label: "all" },
    { value: "REVIEW", label: "review" },
    { value: "SCHEDULED", label: "scheduled" },
    { value: "LIVE", label: "live" },
  ];
  return (
    <div className="inline-flex bg-surface border-hairline border-border rounded-md p-[2px]">
      {buckets.map((b) => (
        <button
          key={b.value}
          type="button"
          onClick={() => onChange(b.value)}
          className={`flex items-center gap-xs px-sm py-[5px] rounded text-[11px] font-mono tracking-[0.16em] uppercase transition-colors ${
            value === b.value
              ? "bg-bg text-ink shadow-sm"
              : "text-ink3 hover:text-ink"
          }`}
        >
          <span>{b.label}</span>
          {counts[b.value] > 0 ? (
            <span className="text-ink4 normal-case tracking-normal">
              {counts[b.value]}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

function ViewToggle({
  value,
  onChange,
}: {
  value: "mockup" | "list";
  onChange: (v: "mockup" | "list") => void;
}) {
  return (
    <div className="inline-flex bg-surface border-hairline border-border rounded-md p-[2px]">
      <ToggleBtn
        active={value === "mockup"}
        onClick={() => onChange("mockup")}
        label="mockup"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </ToggleBtn>
      <ToggleBtn
        active={value === "list"}
        onClick={() => onChange("list")}
        label="list"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <circle cx="4" cy="6" r="1" fill="currentColor" />
          <circle cx="4" cy="12" r="1" fill="currentColor" />
          <circle cx="4" cy="18" r="1" fill="currentColor" />
        </svg>
      </ToggleBtn>
    </div>
  );
}

function ToggleBtn({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex items-center gap-xs px-sm py-[5px] rounded text-[11px] font-mono tracking-[0.16em] uppercase transition-colors ${
        active
          ? "bg-bg text-ink shadow-sm"
          : "text-ink3 hover:text-ink"
      }`}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

// True if a draft is still waiting for at least one image. Used by
// the auto-poll to know when to stop refetching.
function hasMissingImages(d: { format?: string | null; content: unknown }): boolean {
  const c = d.content as Record<string, unknown> | null;
  if (!c || typeof c !== "object") return false;
  const fmt = d.format ?? "SINGLE_POST";

  if (fmt === "SINGLE_POST" || fmt === "EMAIL_NEWSLETTER") {
    const hero = c.heroImage as { url?: string } | undefined;
    return !hero?.url && Boolean(
      // Only consider it "pending" if Echo asked for an image
      // (otherwise text-only drafts would loop forever).
      (c as { imagePrompt?: string }).imagePrompt ??
        (c as { heroImagePrompt?: string }).heroImagePrompt,
    );
  }

  if (fmt === "CAROUSEL") {
    const cover = c.coverSlide as { imageUrl?: string; visualDirection?: string } | undefined;
    if (cover?.visualDirection && !cover.imageUrl) return true;
    const body = (c.bodySlides as Array<{
      template?: string;
      visualDirection?: string;
      imageUrl?: string;
    }>) ?? [];
    return body.some(
      (s) => s.template === "image_cue" && s.visualDirection && !s.imageUrl,
    );
  }

  if (fmt === "REEL_SCRIPT") {
    const beats = (c.beats as Array<{ bRoll?: string; imageUrl?: string }>) ?? [];
    return beats.some((b) => b.bRoll && !b.imageUrl);
  }

  if (fmt === "STORY_SEQUENCE") {
    const frames = (c.frames as Array<{ visualDirection?: string; imageUrl?: string }>) ?? [];
    return frames.some((f) => f.visualDirection && !f.imageUrl);
  }

  return false;
}

function initialsFor(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join("") || "—"
  );
}
