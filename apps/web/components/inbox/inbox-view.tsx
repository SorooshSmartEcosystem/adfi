"use client";
import { useMemo, useState } from "react";
import { trpc } from "../../lib/trpc";
import { Card } from "../shared/card";
import { ThreadRow } from "./thread-row";

type Filter = "all" | "calls" | "texts" | "dms" | "telegram";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "all" },
  { id: "calls", label: "calls" },
  { id: "texts", label: "texts" },
  { id: "dms", label: "dms" },
  { id: "telegram", label: "telegram" },
];

const EMPTY_COPY: Record<Filter, { headline: string; body: string | null }> = {
  all: {
    headline: "nothing yet — your adfi number will catch things here.",
    body: "forward your business line to your adfi number, or paste it on your site / google business profile.",
  },
  calls: {
    headline: "no calls yet.",
    body: "missed calls forwarded to your adfi number land here with a transcript.",
  },
  texts: {
    headline: "no texts yet.",
    body: "sms to your adfi number arrives here. signal replies in your voice.",
  },
  dms: {
    headline: "no dms yet.",
    body: "instagram, messenger, and telegram dms land here once those channels are connected.",
  },
  telegram: {
    headline: "no telegram dms yet.",
    body: "send a message to your bot to test — i'll show up here in a few seconds.",
  },
};

export function InboxView({
  onSelect,
  activeId,
}: {
  onSelect: (item: { id: string; kind: "thread" | "call" }) => void;
  activeId?: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const query = trpc.messaging.inboxFeed.useQuery({ filter, limit: 30 });

  const items = query.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const haystack = [
        it.displayName ?? "",
        it.fromAddress,
        it.preview,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, search]);

  return (
    <Card padded={false} className="flex flex-col min-h-0 overflow-hidden">
      <div className="flex flex-col gap-sm px-lg py-md border-b-hairline border-border2 shrink-0">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="search name or message…"
          className="w-full px-md py-[8px] bg-bg border-hairline border-border rounded-full text-sm focus:outline-none focus:border-ink"
        />
        <div className="flex flex-wrap gap-[4px] -mx-[2px]">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-md py-[6px] rounded-full text-xs transition-colors ${
                filter === f.id
                  ? "bg-surface text-ink"
                  : "text-ink4 hover:text-ink2"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {query.isLoading ? (
          <div className="px-lg py-xl text-sm text-ink3">one second</div>
        ) : filtered.length === 0 ? (
          <div className="px-lg py-xl">
            <p className="text-md leading-[1.6] text-ink2 mb-md">
              {search.trim()
                ? "no threads match that search."
                : EMPTY_COPY[filter].headline}
            </p>
            {!search.trim() && EMPTY_COPY[filter].body ? (
              <p className="text-sm text-ink3 leading-[1.6]">
                {EMPTY_COPY[filter].body}
              </p>
            ) : null}
          </div>
        ) : (
          filtered.map((item, i) => (
            <ThreadRow
              key={`${item.kind}-${item.id}`}
              item={item}
              active={activeId === item.id}
              isLast={i === filtered.length - 1}
              onClick={() => onSelect({ id: item.id, kind: item.kind })}
            />
          ))
        )}
      </div>
    </Card>
  );
}
