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

  const menuContent = (
    <div
      className="bg-bg border-hairline border-border rounded-md p-xs min-w-[180px] shadow-lg"
      onMouseDown={(e) => e.preventDefault()}
    >
      {(draft.status === "AWAITING_REVIEW" || draft.status === "DRAFT") ? (
        <>
          <MenuItem
            onClick={() => {
              approve.mutate({ id: draft.id, variant: "primary" });
              setShowMenu(false);
            }}
          >
            approve
          </MenuItem>
          <MenuItem
            onClick={() => {
              regenerate.mutate({ id: draft.id });
              setShowMenu(false);
            }}
          >
            regenerate
          </MenuItem>
          <MenuItem
            onClick={() => {
              draftScript.mutate({ brief: textBrief(normalized) });
              setShowMenu(false);
            }}
          >
            make video
          </MenuItem>
          <MenuItem
            onClick={() => {
              navigator.clipboard.writeText(textBrief(normalized));
              setShowMenu(false);
            }}
          >
            copy text
          </MenuItem>
          <MenuDivider />
          <MenuItem
            danger
            onClick={() => {
              reject.mutate({ id: draft.id });
              setShowMenu(false);
            }}
          >
            reject
          </MenuItem>
        </>
      ) : null}
      {draft.status === "APPROVED" ? (
        <>
          <MenuItem onClick={() => setShowMenu(false)}>edit schedule</MenuItem>
          <MenuItem
            onClick={() => {
              navigator.clipboard.writeText(textBrief(normalized));
              setShowMenu(false);
            }}
          >
            copy text
          </MenuItem>
          <MenuDivider />
          <MenuItem
            danger
            onClick={() => {
              reject.mutate({ id: draft.id });
              setShowMenu(false);
            }}
          >
            unschedule
          </MenuItem>
        </>
      ) : null}
      {draft.status === "PUBLISHED" ? (
        <>
          <MenuItem onClick={() => setShowMenu(false)}>view live ↗</MenuItem>
          <MenuItem
            onClick={() => {
              navigator.clipboard.writeText(textBrief(normalized));
              setShowMenu(false);
            }}
          >
            copy text
          </MenuItem>
        </>
      ) : null}
      {draft.status === "FAILED" ? (
        <MenuItem
          onClick={() => {
            regenerate.mutate({ id: draft.id });
            setShowMenu(false);
          }}
        >
          retry
        </MenuItem>
      ) : null}
    </div>
  );

  // ────────────────────────────────────────────────────────────────
  // List view
  // ────────────────────────────────────────────────────────────────
  if (view === "list") {
    const preview = (normalized.caption ?? normalized.body ?? normalized.hook ?? "")
      .replace(/\s+/g, " ")
      .trim();
    return (
      <div
        className={`relative bg-bg border-hairline border-border rounded-md p-md ${
          isPending ? "opacity-50" : ""
        }`}
        onBlur={scheduleMenuClose}
      >
        <div className="flex items-start gap-md">
          <span
            className="font-mono text-[10px] tracking-[0.2em] uppercase mt-[3px]"
            style={{ color: status.color }}
          >
            {status.text}
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink4 mb-xs">
              {(format ?? "SINGLE_POST").toLowerCase().replace(/_/g, " ")} ·{" "}
              {platform.toLowerCase()}
            </div>
            <p className="text-sm leading-relaxed text-ink line-clamp-2" dir="auto">
              {preview || "—"}
            </p>
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
      className={`relative flex flex-col items-center ${isPending ? "opacity-50 transition-opacity" : ""}`}
      onBlur={scheduleMenuClose}
    >
      {/* Floating status pill — top-left, sits over the mockup so we
          don't need an outer chrome box. */}
      <span
        className="absolute -top-xs left-0 font-mono text-[9px] tracking-[0.22em] uppercase bg-bg/95 backdrop-blur px-sm py-[3px] rounded-full border-hairline border-border z-20"
        style={{ color: status.color }}
      >
        {status.text}
      </span>

      <PlatformMockup
        platform={platform}
        format={format}
        business={business}
        content={normalized}
        mp4Url={motion?.mp4Url ?? null}
        menu={{
          open: showMenu,
          onToggle: () => setShowMenu((v) => !v),
          content: menuContent,
        }}
      />

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
