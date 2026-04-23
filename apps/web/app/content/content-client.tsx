"use client";
import { useState } from "react";
import { trpc } from "../../lib/trpc";

type DraftContent = {
  caption?: string;
  hashtags?: string[];
  pillar?: string;
};

export function ContentClient() {
  const [hint, setHint] = useState("");
  const utils = trpc.useUtils();

  const awaitingQuery = trpc.content.listDrafts.useQuery({
    status: "AWAITING_REVIEW",
    limit: 50,
  });
  const approvedQuery = trpc.content.listDrafts.useQuery({
    status: "APPROVED",
    limit: 20,
  });

  function invalidateAll() {
    utils.content.listDrafts.invalidate();
  }

  const approveMutation = trpc.content.approveDraft.useMutation({
    onSuccess: invalidateAll,
  });
  const rejectMutation = trpc.content.rejectDraft.useMutation({
    onSuccess: invalidateAll,
  });
  const generateMutation = trpc.content.generate.useMutation({
    onSuccess: () => {
      setHint("");
      invalidateAll();
    },
  });

  const awaiting = awaitingQuery.data?.items ?? [];
  const approved = approvedQuery.data?.items ?? [];
  const isLoading = awaitingQuery.isLoading || approvedQuery.isLoading;

  return (
    <div className="flex flex-col gap-xl w-full max-w-md">
      <div className="flex items-center gap-md">
        <span
          className="inline-block w-sm h-sm rounded-full bg-alive"
          aria-hidden
        />
        <h1 className="text-2xl font-medium tracking-tight">ADFI</h1>
      </div>

      <section className="flex flex-col gap-md">
        <p className="text-xs font-mono text-ink3 uppercase tracking-wide">
          generate new
        </p>
        <input
          type="text"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="optional hint (e.g. 'new batch' or 'quieter this week')"
          className="px-md py-sm bg-surface border border-border rounded-md text-ink focus:outline-none focus:border-ink3"
          disabled={generateMutation.isPending}
        />
        <button
          onClick={() =>
            generateMutation.mutate(hint ? { hint } : {})
          }
          disabled={generateMutation.isPending}
          className="px-md py-sm bg-ink text-bg rounded-md font-medium disabled:opacity-50"
        >
          {generateMutation.isPending
            ? "thinking..."
            : "write me something new"}
        </button>
        {generateMutation.error && (
          <p className="text-sm text-urgent font-mono">
            {generateMutation.error.message}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-md">
        <p className="text-xs font-mono text-ink3 uppercase tracking-wide">
          needs your eyes ({awaiting.length})
        </p>
        {isLoading ? (
          <p className="text-sm text-ink3 font-mono">one second...</p>
        ) : awaiting.length === 0 ? (
          <p className="text-sm text-ink3 font-mono italic">
            nothing waiting for review
          </p>
        ) : (
          awaiting.map((draft) => {
            const content = draft.content as DraftContent;
            return (
              <div
                key={draft.id}
                className="flex flex-col gap-sm bg-surface border border-border rounded-lg p-md"
              >
                {content.pillar && (
                  <p className="text-xs font-mono text-ink3">
                    {content.pillar}
                  </p>
                )}
                <p className="text-md text-ink whitespace-pre-wrap">
                  {content.caption ?? "(empty)"}
                </p>
                {content.hashtags && content.hashtags.length > 0 && (
                  <p className="text-sm text-ink3 font-mono">
                    {content.hashtags.map((t) => `#${t.replace(/^#/, "")}`).join(" ")}
                  </p>
                )}
                <div className="flex gap-sm mt-sm">
                  <button
                    onClick={() => approveMutation.mutate({ id: draft.id })}
                    disabled={approveMutation.isPending}
                    className="px-md py-xs bg-ink text-bg rounded-md text-sm font-medium disabled:opacity-50"
                  >
                    approve
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate({ id: draft.id })}
                    disabled={rejectMutation.isPending}
                    className="px-md py-xs bg-bg border border-border text-ink3 rounded-md text-sm font-medium disabled:opacity-50"
                  >
                    reject
                  </button>
                </div>
              </div>
            );
          })
        )}
      </section>

      {approved.length > 0 && (
        <section className="flex flex-col gap-md">
          <p className="text-xs font-mono text-ink3 uppercase tracking-wide">
            scheduled ({approved.length})
          </p>
          {approved.map((draft) => {
            const content = draft.content as DraftContent;
            return (
              <div
                key={draft.id}
                className="flex flex-col gap-xs bg-bg border border-border2 rounded-lg p-md"
              >
                <p className="text-sm text-ink whitespace-pre-wrap line-clamp-2">
                  {content.caption ?? "(empty)"}
                </p>
                {draft.scheduledFor && (
                  <p className="text-xs font-mono text-ink4">
                    {new Date(draft.scheduledFor).toLocaleString()}
                  </p>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
