"use client";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { Card } from "../shared/card";
import { StatusDot } from "../shared/status-dot";
import { DraftBody } from "./draft-body";

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
  format?: string;
  content: unknown;
  alternateContent?: unknown;
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
  const [variant, setVariant] = useState<"primary" | "alternate">("primary");
  const utils = trpc.useUtils();
  const hasAlternate = Boolean(
    draft.alternateContent && typeof draft.alternateContent === "object",
  );
  const visibleContent =
    variant === "alternate" && hasAlternate
      ? draft.alternateContent
      : draft.content;

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
  const publish = trpc.content.publishDraft.useMutation({
    onSuccess: () => utils.content.listDrafts.invalidate(),
  });
  const regenImages = trpc.content.regenerateImages.useMutation({
    onSuccess: () => utils.content.listDrafts.invalidate(),
  });
  const testSend = trpc.content.testSendNewsletter.useMutation();

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
          {draft.format ? (
            <span className="font-mono text-sm text-ink4">
              · {draft.format.toLowerCase().replace(/_/g, " ")}
            </span>
          ) : null}
        </div>
        {voiceScore !== null && !Number.isNaN(voiceScore) ? (
          <span className="font-mono text-xs text-ink4">
            voice {Math.round(voiceScore * 100)}%
          </span>
        ) : null}
      </div>

      {hasAlternate ? (
        <div className="flex items-center gap-xs mb-md">
          <button
            type="button"
            onClick={() => setVariant("primary")}
            className={`font-mono text-xs px-md py-[5px] rounded-full border-hairline transition-colors ${
              variant === "primary"
                ? "bg-ink text-white border-ink"
                : "text-ink2 border-border hover:border-ink hover:text-ink"
            }`}
          >
            variant a
          </button>
          <button
            type="button"
            onClick={() => setVariant("alternate")}
            className={`font-mono text-xs px-md py-[5px] rounded-full border-hairline transition-colors ${
              variant === "alternate"
                ? "bg-ink text-white border-ink"
                : "text-ink2 border-border hover:border-ink hover:text-ink"
            }`}
          >
            variant b
          </button>
          <span className="font-mono text-[10px] text-ink4 ml-sm">
            two angles · approve picks the live one
          </span>
        </div>
      ) : null}

      <DraftBody format={draft.format ?? "SINGLE_POST"} content={visibleContent} />
      <div className="mb-md" />

      {draft.status === "APPROVED" && draft.platform === "EMAIL" ? (
        <div className="flex items-center gap-sm flex-wrap pt-md border-t-hairline border-border2">
          <button
            type="button"
            onClick={() => publish.mutate({ id: draft.id })}
            disabled={publish.isPending}
            className="bg-ink text-white font-mono text-xs px-md py-[7px] rounded-full disabled:opacity-40 hover:opacity-85 transition-opacity"
          >
            {publish.isPending ? "sending..." : "send newsletter →"}
          </button>
          {publish.data ? (
            <span className="font-mono text-xs text-aliveDark">
              ✓ sent to {publish.data.sent}
              {publish.data.failed > 0
                ? ` · ${publish.data.failed} failed`
                : ""}
            </span>
          ) : null}
          {publish.error ? (
            <span className="font-mono text-xs text-urgent">
              {publish.error.message}
            </span>
          ) : null}
        </div>
      ) : null}

      {draft.status === "AWAITING_REVIEW" ||
      draft.status === "AWAITING_PHOTOS" ||
      draft.status === "DRAFT" ? (
        <div className="flex items-center gap-sm flex-wrap pt-md border-t-hairline border-border2">
          <button
            type="button"
            onClick={() => approve.mutate({ id: draft.id, variant })}
            disabled={pending}
            className="bg-ink text-white font-mono text-xs px-md py-[7px] rounded-full disabled:opacity-40 hover:opacity-85 transition-opacity"
          >
            {approve.isPending
              ? "approving..."
              : hasAlternate
                ? `approve ${variant === "primary" ? "a" : "b"}`
                : "approve"}
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
          <button
            type="button"
            onClick={() => regenImages.mutate({ id: draft.id })}
            disabled={pending || regenImages.isPending}
            className="font-mono text-xs text-ink2 border-hairline border-border rounded-full px-md py-[6px] hover:border-ink hover:text-ink transition-colors disabled:opacity-40"
          >
            {regenImages.isPending ? "rerolling images..." : "reroll images"}
          </button>
          {draft.platform === "EMAIL" ? (
            <button
              type="button"
              onClick={() => testSend.mutate({ id: draft.id })}
              disabled={pending || testSend.isPending}
              className="font-mono text-xs text-ink2 border-hairline border-border rounded-full px-md py-[6px] hover:border-ink hover:text-ink transition-colors disabled:opacity-40"
            >
              {testSend.isPending
                ? "sending test..."
                : testSend.data
                  ? `✓ test sent to ${testSend.data.sentTo}`
                  : "send to me first"}
            </button>
          ) : null}
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
