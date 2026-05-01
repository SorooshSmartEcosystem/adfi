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

export function DraftsPanel() {
  const [filter, setFilter] = useState<PlatformValue>("ALL");

  const platformArg =
    filter === "ALL"
      ? undefined
      : (filter as Exclude<PlatformValue, "ALL">);

  // Fetch awaiting + approved together so the grid shows the most
  // recent drafts regardless of state. Status pill on each card
  // tells the user which state they're in.
  const drafts = trpc.content.listDrafts.useQuery(
    {
      limit: 30,
      platform: platformArg,
    },
    {
      // Light caching — keep 30s so tab switches don't refetch.
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
    },
  );

  const me = trpc.user.me.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const businessQuery = trpc.business.getActive.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const items = drafts.data?.items ?? [];

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
      {/* Filter row — just an icon, right-aligned */}
      <div className="flex items-center justify-end">
        <FilterButton value={filter} onChange={setFilter} />
      </div>

      {drafts.isLoading ? (
        <p className="text-sm text-ink3 py-lg" dir="auto">one second</p>
      ) : items.length === 0 ? (
        <div className="bg-surface rounded-md p-lg">
          <p className="text-md leading-relaxed" dir="auto">
            inbox zero — nothing to review yet. tap{" "}
            <span className="font-medium">draft post</span> at the top to
            ask echo for one.
          </p>
        </div>
      ) : (
        <div className="grid gap-md md:grid-cols-2">
          {items.map((d) => (
            <DraftCardV2 key={d.id} draft={d} business={business} />
          ))}
        </div>
      )}
    </div>
  );
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
