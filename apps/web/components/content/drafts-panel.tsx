"use client";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { DraftCard } from "./draft-card";
import { PlatformFilter, type PlatformValue } from "./platform-filter";

// DraftsPanel — feed of drafts grouped by review state. Generation
// moved to <GenerateBar> at the page level; this panel is read-only
// browsing + per-draft actions.

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

  const awaitingItems = awaiting.data?.items ?? [];
  const approvedItems = approved.data?.items ?? [];
  const isLoading = awaiting.isLoading || approved.isLoading;

  return (
    <>
      <PlatformFilter
        value={filter}
        onChange={setFilter}
        label="filter drafts"
      />

      <section className="mb-xl">
        <div className="text-xs text-ink4 mb-md">
          needs your eyes · {awaitingItems.length}
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
              echo drafts on the weekly cadence, or you can pick a format chip
              above and hit &apos;write me one&apos; for an on-demand draft.
              tip: pick the format that hasn&apos;t shipped recently to keep
              your feed varied.
            </p>
          </div>
        ) : (
          awaitingItems.map((d, i) => (
            <DraftCard key={d.id} draft={d} defaultExpanded={i === 0} />
          ))
        )}
      </section>

      {approvedItems.length > 0 ? (
        <section className="mb-xl">
          <div className="text-xs text-ink4 mb-md">
            SCHEDULED · {approvedItems.length}
          </div>
          {approvedItems.map((d) => (
            <DraftCard key={d.id} draft={d} />
          ))}
        </section>
      ) : null}
    </>
  );
}
