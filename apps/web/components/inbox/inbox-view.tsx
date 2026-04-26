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
      <div className="flex items-center justify-end px-lg py-md border-b-hairline border-border2">
        <div className="flex gap-[4px]">
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

      {query.isLoading ? (
        <div className="px-lg py-xl text-sm text-ink3">one second</div>
      ) : items.length === 0 ? (
        <div className="px-lg py-xl">
          <p className="text-md leading-[1.6] text-ink2 mb-md">
            nothing yet — your adfi number will catch things here.
          </p>
          <ul className="text-sm text-ink3 leading-[1.6] space-y-xs">
            <li>· forward your business line to your adfi number (settings → adfi number)</li>
            <li>· put the adfi number on your website or google business profile</li>
          </ul>
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
