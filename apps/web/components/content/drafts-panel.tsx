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
  const [view, setView] = useState<"mockup" | "list">("mockup");

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
      {/* Toolbar — view toggle (left) + filter (right) */}
      <div className="flex items-center justify-between">
        <ViewToggle value={view} onChange={setView} />
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
        <div
          className={
            view === "list"
              ? "flex flex-col gap-sm"
              : "grid gap-lg md:grid-cols-2 justify-items-center"
          }
        >
          {items.map((d) => (
            <DraftCardV2
              key={d.id}
              draft={d}
              business={business}
              view={view}
            />
          ))}
        </div>
      )}
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
