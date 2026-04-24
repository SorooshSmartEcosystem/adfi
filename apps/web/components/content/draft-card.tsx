"use client";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { Card } from "../shared/card";
import { StatusDot } from "../shared/status-dot";

type DraftStatus =
  | "DRAFT"
  | "AWAITING_PHOTOS"
  | "AWAITING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "PUBLISHED"
  | "FAILED";

type Draft = {
  id: string;
  platform: string;
  status: string;
  content: unknown;
  voiceMatchScore: unknown;
  createdAt: Date;
  scheduledFor: Date | null;
};

const STATUS_TONE: Record<
  DraftStatus,
  { label: string; color: string; dot: "alive" | "attn" | "urgent" | "neutral" }
> = {
  AWAITING_REVIEW: { label: "NEEDS YOU", color: "text-attentionText", dot: "attn" },
  AWAITING_PHOTOS: { label: "NEEDS PHOTOS", color: "text-attentionText", dot: "attn" },
  DRAFT: { label: "DRAFT", color: "text-ink3", dot: "neutral" },
  APPROVED: { label: "SCHEDULED", color: "text-aliveDark", dot: "alive" },
  PUBLISHED: { label: "PUBLISHED", color: "text-aliveDark", dot: "alive" },
  REJECTED: { label: "REJECTED", color: "text-ink4", dot: "neutral" },
  FAILED: { label: "FAILED", color: "text-urgent", dot: "urgent" },
};

export function DraftCard({ draft }: { draft: Draft }) {
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenHint, setRegenHint] = useState("");
  const utils = trpc.useUtils();

  const approve = trpc.content.approveDraft.useMutation({
    onSuccess: () => utils.content.listDrafts.invalidate(),
  });
  const reject = trpc.content.rejectDraft.useMutation({
    onSuccess: () => utils.content.listDrafts.invalidate(),
  });
  const regenerate = trpc.content.regenerateDraft.useMutation({
    onSuccess: () => {
      utils.content.listDrafts.invalidate();
      setRegenOpen(false);
      setRegenHint("");
    },
  });

  const content = (draft.content ?? {}) as {
    caption?: string;
    hashtags?: string[];
    pillar?: string;
  };
  const status =
    STATUS_TONE[draft.status as DraftStatus] ?? STATUS_TONE.DRAFT;
  const rawVoice = draft.voiceMatchScore;
  const voiceScore: number | null =
    typeof rawVoice === "number"
      ? rawVoice
      : typeof rawVoice === "string"
        ? Number(rawVoice)
        : null;
  const pending =
    approve.isPending || reject.isPending || regenerate.isPending;

  return (
    <Card className="mb-md">
      <div className="flex items-center justify-between mb-sm">
        <div className="flex items-center gap-sm">
          <StatusDot tone={status.dot} animated={status.dot === "attn"} />
          <span
            className={`font-mono text-sm tracking-[0.2em] ${status.color}`}
          >
            {status.label}
          </span>
          <span className="font-mono text-sm text-ink4">·</span>
          <span className="font-mono text-sm text-ink4">
            {draft.platform.toLowerCase()}
          </span>
          {content.pillar ? (
            <span className="font-mono text-sm text-ink4">· {content.pillar}</span>
          ) : null}
        </div>
        {voiceScore !== null && !Number.isNaN(voiceScore) ? (
          <span className="font-mono text-xs text-ink4">
            voice {Math.round(voiceScore * 100)}%
          </span>
        ) : null}
      </div>

      <p className="text-md leading-relaxed whitespace-pre-wrap mb-md">
        {content.caption ?? "(empty)"}
      </p>

      {content.hashtags && content.hashtags.length > 0 ? (
        <p className="text-sm text-ink3 font-mono mb-md">
          {content.hashtags
            .map((t) => `#${t.replace(/^#/, "")}`)
            .join("  ")}
        </p>
      ) : null}

      {draft.status === "AWAITING_REVIEW" ||
      draft.status === "AWAITING_PHOTOS" ||
      draft.status === "DRAFT" ? (
        <div className="flex items-center gap-sm flex-wrap pt-md border-t-hairline border-border2">
          <button
            type="button"
            onClick={() => approve.mutate({ id: draft.id })}
            disabled={pending}
            className="bg-ink text-white font-mono text-xs px-md py-[7px] rounded-full disabled:opacity-40 hover:opacity-85 transition-opacity"
          >
            {approve.isPending ? "approving..." : "approve"}
          </button>
          <button
            type="button"
            onClick={() => reject.mutate({ id: draft.id })}
            disabled={pending}
            className="font-mono text-xs text-ink2 border-hairline border-border rounded-full px-md py-[6px] hover:border-ink hover:text-ink transition-colors disabled:opacity-40"
          >
            reject
          </button>
          <button
            type="button"
            onClick={() => setRegenOpen((v) => !v)}
            disabled={pending}
            className="font-mono text-xs text-ink2 border-hairline border-border rounded-full px-md py-[6px] hover:border-ink hover:text-ink transition-colors disabled:opacity-40"
          >
            write differently
          </button>
        </div>
      ) : null}

      {regenOpen ? (
        <div className="mt-md flex items-center gap-sm">
          <input
            type="text"
            value={regenHint}
            onChange={(e) => setRegenHint(e.target.value)}
            placeholder="hint — e.g. shorter, less formal, focus on price"
            className="flex-1 px-md py-[10px] bg-bg border-hairline border-border rounded-full text-sm focus:outline-none focus:border-ink"
          />
          <button
            type="button"
            onClick={() =>
              regenerate.mutate({
                id: draft.id,
                hint: regenHint.trim() || undefined,
              })
            }
            disabled={regenerate.isPending}
            className="bg-ink text-white font-mono text-xs px-md py-[10px] rounded-full disabled:opacity-40"
          >
            {regenerate.isPending ? "rewriting..." : "rewrite →"}
          </button>
        </div>
      ) : null}

      {(approve.error || reject.error || regenerate.error) && (
        <p className="text-sm text-urgent font-mono mt-md">
          {approve.error?.message ||
            reject.error?.message ||
            regenerate.error?.message}
        </p>
      )}
    </Card>
  );
}
