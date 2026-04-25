"use client";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { DraftCard } from "./draft-card";

type Format =
  | "AUTO"
  | "SINGLE_POST"
  | "CAROUSEL"
  | "REEL_SCRIPT"
  | "EMAIL_NEWSLETTER"
  | "STORY_SEQUENCE";

const FORMAT_OPTIONS: { id: Format; label: string }[] = [
  { id: "AUTO", label: "auto" },
  { id: "SINGLE_POST", label: "single post" },
  { id: "CAROUSEL", label: "carousel" },
  { id: "REEL_SCRIPT", label: "reel" },
  { id: "EMAIL_NEWSLETTER", label: "email" },
  { id: "STORY_SEQUENCE", label: "stories" },
];

export function DraftsPanel() {
  const [hint, setHint] = useState("");
  const [format, setFormat] = useState<Format>("AUTO");
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

        <div className="flex flex-wrap gap-xs mb-md">
          {FORMAT_OPTIONS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFormat(f.id)}
              className={`font-mono text-xs px-md py-[5px] rounded-full border-hairline transition-colors ${
                format === f.id
                  ? "bg-ink text-white border-ink"
                  : "text-ink2 border-border hover:border-ink hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-sm">
          <input
            type="text"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="optional hint (e.g. 'announce the spring drop', 'something quieter this week')"
            disabled={generate.isPending}
            className="flex-1 px-md py-[10px] bg-bg border-hairline border-border rounded-full text-sm focus:outline-none focus:border-ink"
          />
          <button
            type="button"
            onClick={() => {
              const payload: {
                hint?: string;
                format?: Exclude<Format, "AUTO">;
                platform?: "INSTAGRAM" | "EMAIL";
              } = {};
              if (hint.trim()) payload.hint = hint;
              if (format !== "AUTO") {
                payload.format = format;
                if (format === "EMAIL_NEWSLETTER") payload.platform = "EMAIL";
              }
              generate.mutate(payload);
            }}
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
          <div className="bg-surface rounded-md p-lg">
            <p className="text-md leading-relaxed mb-sm">
              inbox zero — nothing waiting for review.
            </p>
            <p className="text-sm text-ink3 leading-relaxed">
              echo drafts on the weekly cadence, or you can pick a format chip
              above and hit &apos;write me one&apos; for an on-demand draft.
              tip: pick the format that hasn&apos;t shipped recently to keep
              your feed varied.
            </p>
          </div>
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
