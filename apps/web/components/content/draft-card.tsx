"use client";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { Card } from "../shared/card";
import { StatusDot } from "../shared/status-dot";
import { DraftBody } from "./draft-body";
import { SinglePostEditor } from "./single-post-editor";
import { CaptionEditor } from "./caption-editor";

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
  AWAITING_REVIEW: { label: "needs you", color: "text-attentionText", dot: "attn" },
  AWAITING_PHOTOS: { label: "needs photos", color: "text-attentionText", dot: "attn" },
  DRAFT: { label: "draft", color: "text-ink3", dot: "neutral" },
  APPROVED: { label: "scheduled", color: "text-aliveDark", dot: "alive" },
  PUBLISHED: { label: "published", color: "text-aliveDark", dot: "alive" },
  REJECTED: { label: "rejected", color: "text-ink4", dot: "neutral" },
  FAILED: { label: "failed", color: "text-urgent", dot: "urgent" },
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
  const markPosted = trpc.content.markAsPosted.useMutation({
    onSuccess: () => utils.content.listDrafts.invalidate(),
  });
  const regenImages = trpc.content.regenerateImages.useMutation({
    onSuccess: () => utils.content.listDrafts.invalidate(),
  });
  const testSend = trpc.content.testSendNewsletter.useMutation();
  const updateContent = trpc.content.updateDraftContent.useMutation({
    onSuccess: () => {
      utils.content.listDrafts.invalidate();
      setEditOpen(false);
    },
  });
  const [editOpen, setEditOpen] = useState(false);

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
    <Card className="mb-md" id={`d-${draft.id}`}>
      <div className="flex items-center justify-between mb-sm">
        <div className="flex items-center gap-sm flex-wrap">
          <StatusDot tone={status.dot} animated={status.dot === "attn"} />
          <span className={`text-xs ${status.color}`}>
            {status.label.toLowerCase()}
          </span>
          <span className="text-xs text-ink4">
            · {draft.platform.toLowerCase()}
            {draft.format
              ? ` · ${draft.format.toLowerCase().replace(/_/g, " ")}`
              : ""}
          </span>
        </div>
        {voiceScore !== null && !Number.isNaN(voiceScore) ? (
          <span className="text-xs text-ink4">
            voice {Math.round(voiceScore * 100)}%
          </span>
        ) : null}
      </div>

      {hasAlternate ? (
        <div className="flex items-center gap-xs mb-md">
          <button
            type="button"
            onClick={() => setVariant("primary")}
            className={`text-xs px-md py-[5px] rounded-full border-hairline transition-colors ${
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
            className={`text-xs px-md py-[5px] rounded-full border-hairline transition-colors ${
              variant === "alternate"
                ? "bg-ink text-white border-ink"
                : "text-ink2 border-border hover:border-ink hover:text-ink"
            }`}
          >
            variant b
          </button>
          <span className="text-[11px] text-ink4 ml-sm">
            two angles · approve picks the live one
          </span>
        </div>
      ) : null}

      {editOpen && draft.format === "SINGLE_POST" ? (
        <SinglePostEditor
          initial={(visibleContent ?? {}) as {
            hook?: string;
            body?: string;
            cta?: string | null;
            hashtags?: string[];
          }}
          pending={updateContent.isPending}
          onSave={(next) =>
            updateContent.mutate({ id: draft.id, ...next })
          }
          onCancel={() => setEditOpen(false)}
        />
      ) : editOpen ? (
        <CaptionEditor
          format={draft.format ?? ""}
          initial={(visibleContent ?? {}) as {
            caption?: string;
            hashtags?: string[];
            subject?: string;
          }}
          pending={updateContent.isPending}
          onSave={(next) =>
            updateContent.mutate({ id: draft.id, ...next })
          }
          onCancel={() => setEditOpen(false)}
        />
      ) : (
        <DraftBody format={draft.format ?? "SINGLE_POST"} content={visibleContent} />
      )}
      <div className="mb-md" />

      {draft.status === "APPROVED" &&
      (draft.platform === "TWITTER" ||
        draft.platform === "WEBSITE_ARTICLE" ||
        draft.platform === "TELEGRAM") ? (
        <ManualPublishActions
          platform={draft.platform}
          content={visibleContent}
          onMarkPosted={(permalink) =>
            markPosted.mutate({ id: draft.id, permalink })
          }
          posting={markPosted.isPending}
          error={markPosted.error?.message ?? null}
        />
      ) : draft.status === "APPROVED" && draft.platform === "EMAIL" ? (
        <div className="flex items-center gap-sm flex-wrap pt-md border-t-hairline border-border2">
          <button
            type="button"
            onClick={() => publish.mutate({ id: draft.id })}
            disabled={publish.isPending}
            className="bg-ink text-white text-xs font-medium px-md py-[7px] rounded-full disabled:opacity-40 hover:opacity-85 transition-opacity"
          >
            {publish.isPending ? "sending..." : "send newsletter →"}
          </button>
          {publish.data ? (
            <span className="text-xs text-aliveDark">
              ✓ sent to {publish.data.sent}
              {publish.data.failed > 0
                ? ` · ${publish.data.failed} failed`
                : ""}
            </span>
          ) : null}
          {publish.error ? (
            <span className="text-xs text-urgent">
              {publish.error.message}
            </span>
          ) : null}
        </div>
      ) : draft.status === "APPROVED" ? (
        <div className="pt-md border-t-hairline border-border2">
          <div className="flex items-center gap-sm flex-wrap">
            <span className="text-xs text-attentionText">
              ● scheduled
            </span>
            <span className="text-xs text-ink4">
              waiting on {draft.platform.toLowerCase()} —{" "}
              <a
                href="/settings#channels"
                className="underline hover:text-ink"
              >
                connect{" "}
                {draft.platform === "INSTAGRAM"
                  ? "instagram"
                  : draft.platform === "FACEBOOK"
                    ? "facebook"
                    : draft.platform === "LINKEDIN"
                      ? "linkedin"
                      : draft.platform.toLowerCase()}{" "}
                →
              </a>
            </span>
          </div>
          <p className="text-sm text-ink3 mt-xs">
            i&apos;ll publish this automatically once the channel is linked.
          </p>
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
            className="bg-ink text-white text-xs font-medium px-md py-[7px] rounded-full disabled:opacity-40 hover:opacity-85 transition-opacity"
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
            className="text-xs text-ink2 border-hairline border-border rounded-full px-md py-[6px] hover:border-ink hover:text-ink transition-colors disabled:opacity-40"
          >
            reject
          </button>
          <button
            type="button"
            onClick={() => setEditOpen((v) => !v)}
            disabled={pending}
            className="text-xs text-ink2 border-hairline border-border rounded-full px-md py-[6px] hover:border-ink hover:text-ink transition-colors disabled:opacity-40"
          >
            {editOpen ? "stop editing" : "edit"}
          </button>
          <button
            type="button"
            onClick={() => setRegenOpen((v) => !v)}
            disabled={pending}
            className="text-xs text-ink2 border-hairline border-border rounded-full px-md py-[6px] hover:border-ink hover:text-ink transition-colors disabled:opacity-40"
          >
            write differently
          </button>
          <button
            type="button"
            onClick={() => regenImages.mutate({ id: draft.id })}
            disabled={pending || regenImages.isPending}
            className="text-xs text-ink2 border-hairline border-border rounded-full px-md py-[6px] hover:border-ink hover:text-ink transition-colors disabled:opacity-40"
          >
            {regenImages.isPending ? "rerolling images..." : "reroll images"}
          </button>
          {draft.platform === "EMAIL" ? (
            <button
              type="button"
              onClick={() => testSend.mutate({ id: draft.id })}
              disabled={pending || testSend.isPending}
              className="text-xs text-ink2 border-hairline border-border rounded-full px-md py-[6px] hover:border-ink hover:text-ink transition-colors disabled:opacity-40"
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

function flattenForCopy(content: unknown): string {
  if (!content || typeof content !== "object") return "";
  const c = content as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof c.hook === "string" && c.hook.trim()) parts.push(c.hook.trim());
  if (typeof c.body === "string" && c.body.trim()) parts.push(c.body.trim());
  if (typeof c.cta === "string" && c.cta.trim()) parts.push(c.cta.trim());
  if (Array.isArray(c.hashtags) && c.hashtags.length > 0) {
    const tags = c.hashtags
      .filter((t): t is string => typeof t === "string")
      .map((t) => (t.startsWith("#") ? t : `#${t}`))
      .join(" ");
    if (tags) parts.push(tags);
  }
  return parts.join("\n\n");
}

function ManualPublishActions({
  platform,
  content,
  onMarkPosted,
  posting,
  error,
}: {
  platform: string;
  content: unknown;
  onMarkPosted: (permalink?: string) => void;
  posting: boolean;
  error: string | null;
}) {
  const [permalink, setPermalink] = useState("");
  const [copied, setCopied] = useState(false);
  const text = flattenForCopy(content);

  const composeUrl =
    platform === "TWITTER"
      ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
      : null;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API may be blocked in certain contexts; fall back to
      // selecting the text on a hidden textarea would be heavier than the
      // user just selecting + copying themselves. Fail silently.
    }
  };

  const platformLabel =
    platform === "TWITTER"
      ? "twitter"
      : platform === "WEBSITE_ARTICLE"
        ? "your blog"
        : "telegram";

  return (
    <div className="pt-md border-t-hairline border-border2 flex flex-col gap-sm">
      <div className="text-xs text-ink3">
        approved · post this to {platformLabel} when you&apos;re ready
      </div>
      <div className="flex items-center gap-sm flex-wrap">
        <button
          type="button"
          onClick={onCopy}
          className="text-xs bg-ink text-white font-medium px-md py-[7px] rounded-full hover:opacity-85 transition-opacity"
        >
          {copied ? "✓ copied" : "copy text"}
        </button>
        {composeUrl ? (
          <a
            href={composeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-ink2 border-hairline border-border rounded-full px-md py-[6px] hover:border-ink hover:text-ink transition-colors"
          >
            open compose →
          </a>
        ) : null}
      </div>
      <div className="flex items-center gap-sm flex-wrap">
        <input
          type="url"
          value={permalink}
          onChange={(e) => setPermalink(e.target.value)}
          placeholder="paste the live post url (optional)"
          className="flex-1 min-w-[200px] px-md py-[7px] bg-bg border-hairline border-border rounded-full text-xs focus:outline-none focus:border-ink"
        />
        <button
          type="button"
          onClick={() => onMarkPosted(permalink.trim() || undefined)}
          disabled={posting}
          className="text-xs text-ink2 border-hairline border-border rounded-full px-md py-[6px] hover:border-ink hover:text-ink transition-colors disabled:opacity-40"
        >
          {posting ? "marking..." : "mark as posted"}
        </button>
      </div>
      {error ? <span className="text-[11px] text-urgent">{error}</span> : null}
    </div>
  );
}
