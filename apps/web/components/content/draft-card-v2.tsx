"use client";

// DraftCard v2 — wraps the platform-mockup family. Single primary
// action per state (approve / regenerate / add photos / preview /
// view live), tertiary actions in a … menu. The mockup is the visual
// core; the chrome around it is intentionally minimal.

import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { PlatformMockup } from "./mockups";
import type { DraftContent } from "./mockups";
import { OrbLoader, STAGES_VIDEO_SCRIPT } from "../shared/orb-loader";
import { ScriptPreview } from "./script-preview";

type Draft = {
  id: string;
  platform: string;
  status: string;
  format?: string;
  content: unknown;
  alternateContent?: unknown;
  createdAt: Date;
  scheduledFor: Date | null;
  motion?: unknown;
};

type Business = {
  name: string;
  handle?: string;
  logoUrl?: string | null;
  initials: string;
};

type MotionState = {
  template?: string;
  status?: "pending" | "rendering" | "ready" | "failed";
  mp4Url?: string;
  error?: string;
};

type PrimaryAction =
  | { kind: "approve"; label: string }
  | { kind: "regenerate"; label: string }
  | { kind: "add-photos"; label: string }
  | { kind: "preview-script"; label: string }
  | { kind: "view-live"; label: string; href: string }
  | { kind: "retry"; label: string };

function statusToAction(status: string, format: string | undefined): PrimaryAction {
  switch (status) {
    case "AWAITING_PHOTOS":
      return { kind: "add-photos", label: "add photos" };
    case "AWAITING_REVIEW":
    case "DRAFT":
      return { kind: "approve", label: "approve →" };
    case "APPROVED":
      return {
        kind: "view-live",
        label: "view scheduled",
        href: `/content/draft/${format ?? "post"}`,
      };
    case "PUBLISHED":
      return { kind: "view-live", label: "view live ↗", href: "#" };
    case "FAILED":
      return { kind: "retry", label: "retry" };
    default:
      return { kind: "regenerate", label: "regenerate" };
  }
}

function statusLabel(status: string): { label: string; tone: "alive" | "attn" | "ink" | "urgent" } {
  switch (status) {
    case "AWAITING_REVIEW":
      return { label: "needs your eyes", tone: "attn" };
    case "AWAITING_PHOTOS":
      return { label: "awaiting photos", tone: "attn" };
    case "DRAFT":
      return { label: "draft", tone: "ink" };
    case "APPROVED":
      return { label: "scheduled", tone: "alive" };
    case "PUBLISHED":
      return { label: "published", tone: "alive" };
    case "REJECTED":
      return { label: "rejected", tone: "ink" };
    case "FAILED":
      return { label: "failed", tone: "urgent" };
    default:
      return { label: status.toLowerCase(), tone: "ink" };
  }
}

function formatLabel(platform: string, format: string | undefined): string {
  if (format === "REEL_SCRIPT") return "INSTAGRAM REEL";
  if (format === "EMAIL_NEWSLETTER") return "EMAIL NEWSLETTER";
  if (format === "STORY_SEQUENCE") return "INSTAGRAM STORY";
  if (format === "CAROUSEL") return `${platform} CAROUSEL`;
  return platform;
}

const TONE_HEX: Record<"alive" | "attn" | "ink" | "urgent", string> = {
  alive: "#3a9d5c",
  attn: "#D9A21C",
  ink: "#888",
  urgent: "#C84A3E",
};

type ScriptForPreview = {
  scenes: { type: string; duration: number; [k: string]: unknown }[];
  design: Record<string, unknown>;
};

export function DraftCardV2({
  draft,
  business,
  brandTokens,
}: {
  draft: Draft;
  business: Business;
  // Optional brand tokens for the in-app video preview Player. When
  // omitted we synthesize a minimal token set from the business
  // name/logo. Real tokens come from the page-level loader pulling
  // BrandKit, so this card stays decoupled.
  brandTokens?: Record<string, string>;
}) {
  const utils = trpc.useUtils();
  const [showMenu, setShowMenu] = useState(false);
  const [draftedScript, setDraftedScript] = useState<ScriptForPreview | null>(
    null,
  );

  const motion = (draft.motion ?? null) as MotionState | null;
  const isVideoRendering = motion?.status === "rendering";

  const action = statusToAction(draft.status, draft.format);
  const status = statusLabel(draft.status);

  const approve = trpc.content.approveDraft.useMutation({
    onSuccess: () => utils.content.listDrafts.invalidate(),
  });
  const reject = trpc.content.rejectDraft.useMutation({
    onSuccess: () => utils.content.listDrafts.invalidate(),
  });
  const regenerate = trpc.content.regenerateDraft.useMutation({
    onSuccess: () => utils.content.listDrafts.invalidate(),
  });
  const draftScript = trpc.motionReel.draftScript.useMutation({
    onSuccess: (script) => {
      setDraftedScript(script as ScriptForPreview);
    },
  });

  const isPending =
    approve.isPending || reject.isPending || regenerate.isPending;

  function handlePrimary() {
    if (action.kind === "approve") {
      approve.mutate({ id: draft.id, variant: "primary" });
    } else if (action.kind === "regenerate" || action.kind === "retry") {
      regenerate.mutate({ id: draft.id });
    } else if (action.kind === "view-live") {
      window.open(action.href, "_blank");
    }
  }

  const content = (draft.content ?? {}) as DraftContent;
  const platform = draft.platform as Parameters<typeof PlatformMockup>[0]["platform"];
  const format = (draft.format ?? "SINGLE_POST") as Parameters<
    typeof PlatformMockup
  >[0]["format"];

  // Synthesize a minimal token set if the parent doesn't pass real
  // BrandKit tokens. Just enough for the script-preview Player to
  // render without crashing.
  const tokens = {
    bg: brandTokens?.bg ?? "#FAFAF7",
    surface: brandTokens?.surface ?? "#F2EFE5",
    surface2: brandTokens?.surface2 ?? "#F8F5EA",
    border: brandTokens?.border ?? "#E5E3DB",
    ink: brandTokens?.ink ?? "#111111",
    ink2: brandTokens?.ink2 ?? "#444444",
    ink3: brandTokens?.ink3 ?? "#666666",
    ink4: brandTokens?.ink4 ?? "#888888",
    alive: brandTokens?.alive ?? "#7CE896",
    aliveDark: brandTokens?.aliveDark ?? "#3A9D5C",
    attnBg: brandTokens?.attnBg ?? "#FFF9ED",
    attnBorder: brandTokens?.attnBorder ?? "#F0D98C",
    attnText: brandTokens?.attnText ?? "#8A6A1E",
    businessName: business.name,
  };

  return (
    <div className="flex flex-col gap-sm">
      {/* HUD strip — quiet platform + format + status indicator */}
      <div className="flex items-center gap-md text-[11px] font-mono tracking-[0.18em] text-ink4">
        <span>{formatLabel(platform, format)}</span>
        <span className="text-ink5">·</span>
        <span style={{ color: TONE_HEX[status.tone] }}>
          {status.label.toUpperCase()}
        </span>
        {draft.scheduledFor ? (
          <>
            <span className="text-ink5">·</span>
            <span>
              {draft.scheduledFor.toLocaleDateString("en-US", {
                weekday: "short",
                hour: "numeric",
              })}
            </span>
          </>
        ) : null}
        <span className="ml-auto text-ink5">
          {draft.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>

      {/* Mockup — the visual core */}
      <div className={isPending ? "opacity-40 transition-opacity" : ""}>
        <PlatformMockup
          platform={platform}
          format={format}
          business={business}
          content={content}
          mp4Url={motion?.mp4Url ?? null}
        />
      </div>

      {/* Action row */}
      {isPending ? (
        <div className="py-md flex items-center justify-center">
          <OrbLoader tone="alive" size="sm" />
        </div>
      ) : isVideoRendering ? (
        <div className="py-md flex items-center justify-center">
          <OrbLoader
            tone="alive"
            size="sm"
            stages={[
              "RENDERING ON LAMBDA",
              "BUNDLING SCENES",
              "ENCODING MP4",
              "UPLOADING",
            ]}
          />
        </div>
      ) : (
        <div className="flex items-center gap-md flex-wrap">
          <button
            type="button"
            onClick={handlePrimary}
            disabled={isPending}
            className="bg-ink text-white text-xs font-medium px-md py-[8px] rounded-full hover:opacity-85 transition-opacity disabled:opacity-40"
          >
            {action.label}
          </button>

          {/* Tertiary links — quiet, mono */}
          {draft.status === "AWAITING_REVIEW" || draft.status === "DRAFT" ? (
            <>
              <button
                type="button"
                onClick={() => regenerate.mutate({ id: draft.id })}
                className="font-mono text-[11px] text-ink3 hover:text-ink transition-colors"
              >
                regenerate
              </button>
              <button
                type="button"
                onClick={() => reject.mutate({ id: draft.id })}
                className="font-mono text-[11px] text-ink3 hover:text-urgent transition-colors"
              >
                reject
              </button>
              {/* Make-video draft + preview path — script first, render
                  only after user approves in the drawer. */}
              {!draftScript.isPending && !draftedScript ? (
                <button
                  type="button"
                  onClick={() =>
                    draftScript.mutate({
                      brief: textBrief(content),
                    })
                  }
                  className="font-mono text-[11px] text-ink3 hover:text-ink transition-colors"
                  disabled={draftScript.isPending}
                >
                  make video
                </button>
              ) : null}
              {draftScript.isPending ? (
                <span className="font-mono text-[11px] text-ink3">
                  drafting script…
                </span>
              ) : null}
            </>
          ) : null}

          {/* Overflow menu trigger — for delete / change platform / etc. */}
          <div className="ml-auto relative">
            <button
              type="button"
              onClick={() => setShowMenu((v) => !v)}
              className="font-mono text-[11px] text-ink3 hover:text-ink"
              aria-label="more actions"
            >
              ⋯
            </button>
            {showMenu ? (
              <div className="absolute right-0 top-full mt-xs bg-bg border-hairline border-border rounded-md p-xs z-10 min-w-[160px] shadow-md">
                <MenuLink>change schedule</MenuLink>
                <MenuLink>change platform</MenuLink>
                <MenuLink>copy text</MenuLink>
                <MenuLink danger>delete</MenuLink>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {(approve.error || reject.error || regenerate.error || draftScript.error) ? (
        <div className="font-mono text-[11px] text-urgent">
          {approve.error?.message ??
            reject.error?.message ??
            regenerate.error?.message ??
            draftScript.error?.message}
        </div>
      ) : null}

      {draftedScript ? (
        <ScriptPreview
          draftId={draft.id}
          script={draftedScript}
          tokens={tokens}
          onClose={() => setDraftedScript(null)}
          onRendered={() => {
            setDraftedScript(null);
            utils.content.listDrafts.invalidate();
          }}
        />
      ) : null}
    </div>
  );
}

// Build a brief for the video agent from the draft's content. The
// brief is what the agent decomposes into scenes — we want the post
// body, hashtags, and any subject/hook so the agent has full context.
function textBrief(content: DraftContent): string {
  const parts = [
    content.hook,
    content.caption ?? content.body,
    content.subject,
    content.hashtags && content.hashtags.length > 0
      ? "hashtags: " + content.hashtags.join(" ")
      : null,
  ].filter(Boolean);
  return parts.join("\n\n");
}

function MenuLink({
  children,
  danger,
}: {
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={`block w-full text-left text-xs px-sm py-xs rounded ${
        danger
          ? "text-urgent hover:bg-urgent/10"
          : "text-ink2 hover:bg-surface"
      }`}
    >
      {children}
    </button>
  );
}
