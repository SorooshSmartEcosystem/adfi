"use client";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { DraftCardV2 } from "./draft-card-v2";
import { PlatformFilter, type PlatformValue } from "./platform-filter";

// DraftsPanel — vertical feed of drafts rendered inside platform-
// authentic mockups (see components/content/mockups/). Generation
// moved to <GenerateBar> at the page level; this panel is read-only
// browsing + per-draft actions via the new DraftCardV2.

export function DraftsPanel() {
  const [filter, setFilter] = useState<PlatformValue>("ALL");

  const platformArg =
    filter === "ALL"
      ? undefined
      : (filter as Exclude<PlatformValue, "ALL">);

  const awaiting = trpc.content.listDrafts.useQuery({
    status: "AWAITING_REVIEW",
    limit: 30,
    platform: platformArg,
  });
  const approved = trpc.content.listDrafts.useQuery({
    status: "APPROVED",
    limit: 20,
    platform: platformArg,
  });

  const me = trpc.user.me.useQuery();
  const businessQuery = trpc.business.getActive.useQuery();

  const awaitingItems = awaiting.data?.items ?? [];
  const approvedItems = approved.data?.items ?? [];
  const isLoading = awaiting.isLoading || approved.isLoading;

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
    <div className="flex flex-col gap-xl">
      <PlatformFilter
        value={filter}
        onChange={setFilter}
        label="filter drafts"
      />

      <section className="flex flex-col gap-xl">
        <div className="font-mono text-[11px] text-ink4 tracking-[0.18em]">
          NEEDS YOUR EYES · {awaitingItems.length}
        </div>
        {isLoading ? (
          <p className="text-sm text-ink3" dir="auto">one second</p>
        ) : awaitingItems.length === 0 ? (
          <div className="bg-surface rounded-md p-lg">
            <p className="text-md leading-relaxed mb-sm" dir="auto">
              {filter === "ALL"
                ? "inbox zero — nothing waiting for review."
                : `nothing waiting on ${filter.toLowerCase().replace(/_/g, " ")}.`}
            </p>
            <p className="text-sm text-ink3 leading-relaxed" dir="auto">
              echo drafts on the weekly cadence. tap{" "}
              <span className="font-medium">draft post</span> at the top to
              ask for one on-demand.
            </p>
          </div>
        ) : (
          awaitingItems.map((d) => (
            <DraftCardV2 key={d.id} draft={d} business={business} />
          ))
        )}
      </section>

      {approvedItems.length > 0 ? (
        <section className="flex flex-col gap-xl">
          <div className="font-mono text-[11px] text-ink4 tracking-[0.18em]">
            SCHEDULED · {approvedItems.length}
          </div>
          {approvedItems.map((d) => (
            <DraftCardV2 key={d.id} draft={d} business={business} />
          ))}
        </section>
      ) : null}
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
