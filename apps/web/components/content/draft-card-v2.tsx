"use client";

// DraftCardV2 (revision 3) — no outer ADFI chrome. The platform
// mockup IS the card. The ⋯ menu lives inside the platform's own
// header (where real IG/X/LinkedIn UIs already have one) via the
// `menu` prop on the mockup. A small floating status pill sits at
// the top-left so the user still sees `review / scheduled / live`
// without us building a wrapper around the post.
//
// Two view modes:
//   - "mockup" (default): platform-authentic mockup
//   - "list":             compact text row (caption + status + ⋯),
//                          for users who want a dense feed scan

import { useRef, useState } from "react";
import { trpc } from "../../lib/trpc";
import { PlatformMockup } from "./mockups";
import type { DraftContent } from "./mockups";
import { normalizeContent } from "./mockups/normalize";
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
  status?: "pending" | "rendering" | "ready" | "failed";
  mp4Url?: string;
  error?: string;
};

type ScriptForPreview = {
  scenes: { type: string; duration: number; [k: string]: unknown }[];
  design: Record<string, unknown>;
};

function statusBlip(status: string): { text: string; color: string } {
  switch (status) {
    case "AWAITING_REVIEW":
      return { text: "review", color: "#D9A21C" };
    case "AWAITING_PHOTOS":
      return { text: "photos", color: "#D9A21C" };
    case "DRAFT":
      return { text: "draft", color: "#888" };
    case "APPROVED":
      return { text: "scheduled", color: "#3a9d5c" };
    case "PUBLISHED":
      return { text: "live", color: "#3a9d5c" };
    case "FAILED":
      return { text: "failed", color: "#C84A3E" };
    default:
      return { text: status.toLowerCase(), color: "#888" };
  }
}

export function DraftCardV2({
  draft,
  business,
  brandTokens,
  view = "mockup",
}: {
  draft: Draft;
  business: Business;
  brandTokens?: Record<string, string>;
  view?: "mockup" | "list";
}) {
  const utils = trpc.useUtils();
  const [showMenu, setShowMenu] = useState(false);
  const [listExpanded, setListExpanded] = useState(false);
  const [draftedScript, setDraftedScript] = useState<ScriptForPreview | null>(null);
  const menuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const motion = (draft.motion ?? null) as MotionState | null;
  const isVideoRendering = motion?.status === "rendering";
  const status = statusBlip(draft.status);

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
    onSuccess: (s) => setDraftedScript(s as ScriptForPreview),
  });

  const isPending = approve.isPending || reject.isPending || regenerate.isPending;

  const platform = draft.platform as Parameters<typeof PlatformMockup>[0]["platform"];
  const format = (draft.format ?? "SINGLE_POST") as Parameters<
    typeof PlatformMockup
  >[0]["format"];

  const normalized: DraftContent = normalizeContent(draft.content, format);

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

  function scheduleMenuClose() {
    if (menuTimerRef.current) clearTimeout(menuTimerRef.current);
    menuTimerRef.current = setTimeout(() => setShowMenu(false), 140);
  }

  // Build menu items based on status. Falls through a default case so
  // REJECTED / AWAITING_PHOTOS / unknown don't render an empty popover.
  const menuItems: React.ReactNode[] = [];
  const copyItem = (
    <MenuItem
      key="copy"
      onClick={() => {
        navigator.clipboard.writeText(textBrief(normalized));
        setShowMenu(false);
      }}
    >
      copy text
    </MenuItem>
  );
  const regenItem = (
    <MenuItem
      key="regen"
      onClick={() => {
        regenerate.mutate({ id: draft.id });
        setShowMenu(false);
      }}
    >
      regenerate
    </MenuItem>
  );
  const rejectItem = (
    <MenuItem
      key="reject"
      danger
      onClick={() => {
        reject.mutate({ id: draft.id });
        setShowMenu(false);
      }}
    >
      reject
    </MenuItem>
  );

  if (draft.status === "AWAITING_REVIEW" || draft.status === "DRAFT") {
    menuItems.push(
      <MenuItem
        key="approve"
        onClick={() => {
          approve.mutate({ id: draft.id, variant: "primary" });
          setShowMenu(false);
        }}
      >
        approve
      </MenuItem>,
      regenItem,
      <MenuItem
        key="video"
        onClick={() => {
          draftScript.mutate({ brief: textBrief(normalized) });
          setShowMenu(false);
        }}
      >
        make video
      </MenuItem>,
      copyItem,
      <MenuDivider key="d1" />,
      rejectItem,
    );
  } else if (draft.status === "APPROVED") {
    menuItems.push(
      copyItem,
      regenItem,
      <MenuDivider key="d1" />,
      <MenuItem
        key="unsched"
        danger
        onClick={() => {
          reject.mutate({ id: draft.id });
          setShowMenu(false);
        }}
      >
        unschedule
      </MenuItem>,
    );
  } else if (draft.status === "PUBLISHED") {
    menuItems.push(copyItem);
    if (format === "REEL_SCRIPT") {
      menuItems.push(
        <MenuItem
          key="rerender"
          onClick={() => {
            draftScript.mutate({ brief: textBrief(normalized) });
            setShowMenu(false);
          }}
        >
          re-render video
        </MenuItem>,
      );
    }
  } else if (draft.status === "FAILED") {
    menuItems.push(
      <MenuItem
        key="retry"
        onClick={() => {
          regenerate.mutate({ id: draft.id });
          setShowMenu(false);
        }}
      >
        retry
      </MenuItem>,
      copyItem,
    );
  } else {
    // REJECTED / AWAITING_PHOTOS / anything else — at minimum let the
    // user copy the text and regenerate (or just dismiss).
    menuItems.push(copyItem, regenItem);
  }

  const menuContent = (
    <div
      className="bg-bg border-hairline border-border rounded-md p-xs min-w-[180px] shadow-lg"
      onMouseDown={(e) => e.preventDefault()}
    >
      {menuItems}
    </div>
  );

  // ────────────────────────────────────────────────────────────────
  // List view
  // ────────────────────────────────────────────────────────────────
  if (view === "list") {
    const fullText = (normalized.caption ?? normalized.body ?? normalized.hook ?? "")
      .replace(/\s+/g, " ")
      .trim();
    const TRUNC = 140;
    const isLong = fullText.length > TRUNC;
    const preview = listExpanded || !isLong
      ? fullText
      : fullText.slice(0, TRUNC).trimEnd() + "…";
    const thumbnail =
      normalized.imageUrl ??
      normalized.slides?.find((s) => s.imageUrl)?.imageUrl ??
      null;
    return (
      <div
        className={`relative bg-bg border-hairline border-border rounded-md p-md ${
          isPending ? "opacity-50" : ""
        }`}
        onBlur={scheduleMenuClose}
      >
        <div className="flex items-start gap-md">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnail}
              alt=""
              className="shrink-0 w-[56px] h-[56px] rounded-md object-cover bg-surface"
            />
          ) : (
            <div className="shrink-0 w-[56px] h-[56px] rounded-md bg-surface border-hairline border-border flex items-center justify-center">
              <span className="text-[10px] text-ink4 font-mono">img</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-xs flex-wrap mb-xs">
              <span
                className="font-mono text-[10px] tracking-[0.2em] uppercase"
                style={{ color: status.color }}
              >
                {status.text}
              </span>
              <span className="text-[11px] text-ink4">
                · {platform.toLowerCase()} ·{" "}
                {(format ?? "SINGLE_POST").toLowerCase().replace(/_/g, " ")}
              </span>
            </div>
            <p
              className={`text-sm leading-relaxed text-ink ${
                listExpanded ? "whitespace-pre-wrap" : "line-clamp-2"
              }`}
              dir="auto"
            >
              {preview || "—"}
            </p>
            {isLong ? (
              <button
                type="button"
                onClick={() => setListExpanded((v) => !v)}
                className="mt-xs text-[11px] font-mono text-ink4 hover:text-ink2"
              >
                {listExpanded ? "show less" : "show more"}
              </button>
            ) : null}
          </div>
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowMenu((v) => !v)}
              disabled={isPending}
              className="text-ink3 hover:text-ink text-lg leading-none px-xs disabled:opacity-30"
              aria-label="actions"
            >
              ⋯
            </button>
            {showMenu ? (
              <div className="absolute right-0 top-full mt-xs z-20">
                {menuContent}
              </div>
            ) : null}
          </div>
        </div>
        {draftScript.isPending ? (
          <div className="mt-sm pt-sm border-t-hairline border-border2 flex items-center justify-center gap-sm">
            <OrbLoader tone="alive" size="sm" stages={STAGES_VIDEO_SCRIPT} />
            <span className="font-mono text-[11px] text-ink3">
              sketching video script…
            </span>
          </div>
        ) : null}
        {isVideoRendering ? (
          <div className="mt-sm pt-sm border-t-hairline border-border2 flex items-center justify-center">
            <OrbLoader tone="alive" size="sm" stages={STAGES_VIDEO_SCRIPT} />
          </div>
        ) : null}
        {(approve.error || reject.error || regenerate.error || draftScript.error) ? (
          <div className="mt-xs font-mono text-[11px] text-urgent">
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

  // ────────────────────────────────────────────────────────────────
  // Mockup view (default)
  // ────────────────────────────────────────────────────────────────
  return (
    <div
      className={`flex flex-col w-full max-w-full min-w-0 ${
        isPending ? "opacity-50 transition-opacity" : ""
      }`}
      onBlur={scheduleMenuClose}
    >
      {/* Status label sits above the mockup — left-aligned with the
          mockup's left edge, never overlapping the post chrome. */}
      <div className="flex items-center gap-sm mb-xs">
        <span className="w-1 h-1 rounded-full" style={{ background: status.color }} />
        <span
          className="font-mono text-[10px] tracking-[0.22em] uppercase"
          style={{ color: status.color }}
        >
          {status.text}
        </span>
        <span className="text-[10px] font-mono text-ink4 tracking-[0.16em] uppercase">
          · {platform.toLowerCase()}
        </span>
      </div>

      {/* Mockup + popover. The popover is a sibling of the mockup, NOT
          a child — keeps it outside the mockup's overflow-hidden so
          short cards (Telegram) don't clip the dropdown. */}
      <div className="relative w-full max-w-full">
        <div className="w-full max-w-full overflow-hidden">
          <PlatformMockup
            platform={platform}
            format={format}
            business={business}
            content={normalized}
            mp4Url={motion?.mp4Url ?? null}
            menu={{
              onToggle: () => setShowMenu((v) => !v),
            }}
          />
        </div>
        {showMenu ? (
          <div className="absolute right-2 top-12 z-50">{menuContent}</div>
        ) : null}
      </div>

      {/* Script-drafting loader — fires when user taps "make video".
          Without this the user clicks and sees nothing for 5–15s
          (Haiku call) and assumes the button is broken. */}
      {draftScript.isPending ? (
        <div className="w-full mt-sm flex items-center justify-center gap-sm">
          <OrbLoader tone="alive" size="sm" stages={STAGES_VIDEO_SCRIPT} />
          <span className="font-mono text-[11px] text-ink3">
            sketching video script…
          </span>
        </div>
      ) : null}

      {isVideoRendering ? (
        <div className="w-full mt-sm flex items-center justify-center">
          <OrbLoader tone="alive" size="sm" stages={STAGES_VIDEO_SCRIPT} />
        </div>
      ) : null}

      {(approve.error || reject.error || regenerate.error || draftScript.error) ? (
        <div className="w-full mt-xs font-mono text-[11px] text-urgent text-center">
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

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full text-left text-xs px-sm py-[7px] rounded ${
        danger
          ? "text-urgent hover:bg-urgent/10"
          : "text-ink2 hover:bg-surface"
      }`}
    >
      {children}
    </button>
  );
}

function MenuDivider() {
  return <div className="my-xs h-px bg-border" />;
}

function textBrief(content: DraftContent): string {
  const parts = [
    content.hook,
    content.caption ?? content.body,
    content.subject,
    content.hashtags && content.hashtags.length > 0
      ? content.hashtags.join(" ")
      : null,
  ].filter(Boolean);
  return parts.join("\n\n");
}
