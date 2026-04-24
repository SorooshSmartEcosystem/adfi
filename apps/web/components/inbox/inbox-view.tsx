"use client";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { Card } from "../shared/card";
import { ThreadRow } from "./thread-row";

type Filter = "all" | "calls" | "texts" | "dms";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "all" },
  { id: "calls", label: "calls" },
  { id: "texts", label: "texts" },
  { id: "dms", label: "dms" },
];

export function InboxView({
  onSelect,
  activeId,
}: {
  onSelect: (item: { id: string; kind: "thread" | "call" }) => void;
  activeId?: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const query = trpc.messaging.inboxFeed.useQuery({ filter, limit: 30 });

  const items = query.data ?? [];

  return (
    <Card padded={false}>
      <div className="flex items-center justify-between px-lg py-md hairline-b2 border-border2">
        <div className="flex items-center gap-sm">
          <span className="font-mono text-sm text-ink4 tracking-[0.2em]">
            ALL CONVERSATIONS
          </span>
          <span className="font-mono text-sm text-ink4">· {items.length}</span>
        </div>
        <div className="flex items-center gap-sm">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`font-mono text-xs px-md py-[5px] rounded-full border-hairline transition-colors ${
                filter === f.id
                  ? "bg-ink text-white border-ink"
                  : "text-ink2 border-border hover:border-ink hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {query.isLoading ? (
        <div className="p-xl text-sm text-ink3 font-mono">one second</div>
      ) : items.length === 0 ? (
        <div className="p-xl text-sm text-ink3">
          no messages yet — once calls and texts land, they&apos;ll show up here.
        </div>
      ) : (
        items.map((item, i) => (
          <ThreadRow
            key={`${item.kind}-${item.id}`}
            item={item}
            active={activeId === item.id}
            isLast={i === items.length - 1}
            onClick={() => onSelect({ id: item.id, kind: item.kind })}
          />
        ))
      )}
    </Card>
  );
}
