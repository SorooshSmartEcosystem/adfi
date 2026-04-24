"use client";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { DraftCard } from "./draft-card";

export function DraftsPanel() {
  const [hint, setHint] = useState("");
  const utils = trpc.useUtils();

  const awaiting = trpc.content.listDrafts.useQuery({
    status: "AWAITING_REVIEW",
    limit: 30,
  });
  const approved = trpc.content.listDrafts.useQuery({
    status: "APPROVED",
    limit: 20,
  });

  const generate = trpc.content.generate.useMutation({
    onSuccess: () => {
      setHint("");
      utils.content.listDrafts.invalidate();
    },
  });

  const awaitingItems = awaiting.data?.items ?? [];
  const approvedItems = approved.data?.items ?? [];
  const isLoading = awaiting.isLoading || approved.isLoading;

  return (
    <>
      <div className="mb-xl">
        <div className="font-mono text-sm text-ink4 tracking-[0.2em] mb-sm">
          GENERATE NEW
        </div>
        <div className="flex items-center gap-sm">
          <input
            type="text"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="optional hint (e.g. 'new batch of bowls', 'something quieter this week')"
            disabled={generate.isPending}
            className="flex-1 px-md py-[10px] bg-bg border-hairline border-border rounded-full text-sm focus:outline-none focus:border-ink"
          />
          <button
            type="button"
            onClick={() => generate.mutate(hint.trim() ? { hint } : {})}
            disabled={generate.isPending}
            className="bg-ink text-white font-mono text-xs px-md py-[10px] rounded-full disabled:opacity-40"
          >
            {generate.isPending ? "thinking..." : "write me one →"}
          </button>
        </div>
        {generate.error ? (
          <p className="text-sm text-urgent font-mono mt-sm">
            {generate.error.message}
          </p>
        ) : null}
      </div>

      <section className="mb-xl">
        <div className="font-mono text-sm text-ink4 tracking-[0.2em] mb-md">
          NEEDS YOUR EYES · {awaitingItems.length}
        </div>
        {isLoading ? (
          <p className="text-sm text-ink3 font-mono">one second</p>
        ) : awaitingItems.length === 0 ? (
          <p className="text-sm text-ink3">
            nothing waiting for review — echo will draft more automatically,
            or you can hit &apos;write me one&apos; above.
          </p>
        ) : (
          awaitingItems.map((d) => <DraftCard key={d.id} draft={d} />)
        )}
      </section>

      {approvedItems.length > 0 ? (
        <section className="mb-xl">
          <div className="font-mono text-sm text-ink4 tracking-[0.2em] mb-md">
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
