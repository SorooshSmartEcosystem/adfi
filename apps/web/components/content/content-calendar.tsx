"use client";

// ContentCalendar — multi-week month-style calendar showing both
// scheduled drafts AND published posts, with a small thumbnail per
// post on the day cell. Replaces the 7-day strip which only showed
// the current week and missed every scheduled post outside it.
//
// Layout:
//   - Header strip: month-year label + prev/next month nav
//   - 7-column grid of day cells
//   - Each cell shows the date number at top-left + up to 4 post
//     chips below; chip overflow becomes "+N more"
//   - Each chip is a thumbnail (image or platform-color square)
//     linked to the post's draft page (or post detail for published)
//
// Data: fetches drafts + posts from tRPC client-side. Filters to the
// visible month range. Cheap; both queries are already cached on
// the page.

import { useMemo, useState } from "react";
import Link from "next/link";
import { trpc } from "../../lib/trpc";
import { Card } from "../shared/card";

type DayItem = {
  id: string;
  kind: "draft" | "post";
  platform: string;
  status: string;
  thumbnailUrl: string | null;
  href: string;
  caption: string;
  scheduledFor: Date | null;
  publishedAt: Date | null;
};

const DAY_LABELS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const PLATFORM_COLOR: Record<string, string> = {
  INSTAGRAM: "#E4405F",
  FACEBOOK: "#1877F2",
  LINKEDIN: "#0A66C2",
  TWITTER: "#000000",
  TELEGRAM: "#229ED9",
  EMAIL: "#5A5A5A",
};

export function ContentCalendar() {
  const [monthAnchor, setMonthAnchor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Fetch a generous window so prev/next month switches don't refetch.
  const drafts = trpc.content.listDrafts.useQuery(
    { limit: 100 },
    { staleTime: 60 * 1000, refetchOnWindowFocus: false },
  );
  const posts = trpc.content.listPosts.useQuery(
    { limit: 100 },
    { staleTime: 60 * 1000, refetchOnWindowFocus: false },
  );

  const items = useMemo<DayItem[]>(() => {
    const out: DayItem[] = [];
    for (const d of drafts.data?.items ?? []) {
      if (!d.scheduledFor && d.status !== "AWAITING_REVIEW") continue;
      out.push({
        id: d.id,
        kind: "draft",
        platform: d.platform,
        status: d.status,
        thumbnailUrl: thumbnailFromContent(d.content),
        href: `/content?tab=feed#d-${d.id}`,
        caption: captionFromContent(d.content),
        scheduledFor: d.scheduledFor,
        publishedAt: null,
      });
    }
    // Map draftId → draft for thumbnail/caption lookup. Posts don't
    // ship the embedded draft on listPosts, but every post has a
    // draftId that should be in the same drafts list (we requested
    // 100 of each — large enough for the typical solopreneur).
    const draftById = new Map(
      (drafts.data?.items ?? []).map((d) => [d.id, d]),
    );
    // Skip published posts where the draft is also in the list — the
    // draft's chip already covers that day cell. (Most cases.)
    const draftIdsInList = new Set(
      (drafts.data?.items ?? []).map((d) => d.id),
    );
    for (const p of posts.data?.items ?? []) {
      if (draftIdsInList.has(p.draftId)) continue;
      const matchingDraft = draftById.get(p.draftId);
      out.push({
        id: p.id,
        kind: "post",
        platform: p.platform,
        status: "PUBLISHED",
        thumbnailUrl: matchingDraft
          ? thumbnailFromContent(matchingDraft.content)
          : null,
        // Link to the draft feed (filtered to LIVE) since the
        // performance panel renders aggregated summaries without
        // per-post anchors.
        href: `/content?tab=feed#d-${p.draftId}`,
        caption: matchingDraft ? captionFromContent(matchingDraft.content) : "",
        scheduledFor: null,
        publishedAt: p.publishedAt,
      });
    }
    return out;
  }, [drafts.data, posts.data]);

  // Build the day grid. Always renders 6 weeks (42 cells) so the
  // calendar height doesn't jump when switching months.
  const cells = useMemo(() => {
    const firstOfMonth = new Date(monthAnchor);
    const startWeekday = firstOfMonth.getDay();
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(gridStart.getDate() - startWeekday);
    const arr: { date: Date; items: DayItem[] }[] = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(gridStart);
      date.setDate(date.getDate() + i);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const dayItems = items.filter((it) => {
        const t = (it.scheduledFor ?? it.publishedAt)?.getTime();
        if (t == null) return false;
        return t >= dayStart.getTime() && t < dayEnd.getTime();
      });
      // Sort: published first, then scheduled by time
      dayItems.sort((a, b) => {
        const ta = (a.scheduledFor ?? a.publishedAt)?.getTime() ?? 0;
        const tb = (b.scheduledFor ?? b.publishedAt)?.getTime() ?? 0;
        return ta - tb;
      });
      arr.push({ date, items: dayItems });
    }
    return arr;
  }, [monthAnchor, items]);

  const monthLabel = monthAnchor.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  function shiftMonth(delta: number) {
    setMonthAnchor((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + delta);
      return next;
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Card>
      <div className="flex items-center justify-between mb-lg flex-wrap gap-md">
        <div>
          <div className="text-xs text-ink4 mb-xs font-mono tracking-[0.18em] uppercase">
            content calendar
          </div>
          <div className="text-lg font-medium" dir="auto">
            {monthLabel.toLowerCase()}
          </div>
        </div>
        <div className="flex items-center gap-xs">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="w-8 h-8 rounded-full border-hairline border-border text-ink3 hover:text-ink hover:border-ink transition-colors"
            aria-label="previous month"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => {
              const d = new Date();
              d.setDate(1);
              d.setHours(0, 0, 0, 0);
              setMonthAnchor(d);
            }}
            className="text-xs px-md h-8 rounded-full border-hairline border-border text-ink3 hover:text-ink hover:border-ink transition-colors"
          >
            today
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="w-8 h-8 rounded-full border-hairline border-border text-ink3 hover:text-ink hover:border-ink transition-colors"
            aria-label="next month"
          >
            ›
          </button>
        </div>
      </div>

      {drafts.isLoading || posts.isLoading ? (
        <div className="text-sm text-ink3 py-lg">one second</div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-[1px] bg-border border-hairline border-border">
            {DAY_LABELS.map((d) => (
              <div
                key={d}
                className="bg-bg text-[10px] font-mono uppercase tracking-[0.16em] text-ink4 px-xs py-[6px] text-center"
              >
                {d}
              </div>
            ))}
            {cells.map((cell, i) => {
              const inCurrentMonth =
                cell.date.getMonth() === monthAnchor.getMonth();
              const isToday = cell.date.getTime() === today.getTime();
              return (
                <div
                  key={i}
                  className={`bg-bg min-h-[88px] md:min-h-[120px] p-[6px] flex flex-col gap-[4px] ${
                    inCurrentMonth ? "" : "opacity-40"
                  } ${isToday ? "outline outline-2 outline-ink -outline-offset-2" : ""}`}
                >
                  <div
                    className={`text-[11px] font-mono ${
                      isToday ? "text-ink font-semibold" : "text-ink3"
                    }`}
                  >
                    {cell.date.getDate()}
                  </div>
                  <DayChips items={cell.items} />
                </div>
              );
            })}
          </div>

          <Legend />
        </>
      )}
    </Card>
  );
}

function DayChips({ items }: { items: DayItem[] }) {
  if (items.length === 0) return null;
  const VISIBLE = 4;
  const visible = items.slice(0, VISIBLE);
  const overflow = items.length - VISIBLE;
  return (
    <div className="flex flex-wrap gap-[3px]">
      {visible.map((it) => (
        <Link
          key={it.id}
          href={it.href}
          className="block group"
          title={`${it.platform.toLowerCase()} · ${formatStatus(it)} · ${it.caption.slice(
            0,
            60,
          )}`}
        >
          <Chip item={it} />
        </Link>
      ))}
      {overflow > 0 ? (
        <span className="text-[9px] font-mono text-ink4 self-center px-[3px]">
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}

function Chip({ item }: { item: DayItem }) {
  const platformBg = PLATFORM_COLOR[item.platform] ?? "#888";
  const isPublished = item.status === "PUBLISHED";
  const isScheduled = item.status === "APPROVED";
  // Status outline — green for published, accent for scheduled, amber for review
  const ring = isPublished
    ? "ring-2 ring-aliveDark"
    : isScheduled
      ? "ring-2 ring-ink"
      : "ring-2 ring-attentionBorder";
  return (
    <span
      className={`relative w-[22px] h-[22px] md:w-[28px] md:h-[28px] rounded-[5px] overflow-hidden block group-hover:scale-110 transition-transform ${ring}`}
      style={{ background: platformBg }}
    >
      {item.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.thumbnailUrl}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-white text-[9px] md:text-[11px] font-bold">
          {item.platform.charAt(0)}
        </span>
      )}
    </span>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-md mt-md flex-wrap text-[10px] font-mono text-ink4">
      <span className="flex items-center gap-xs">
        <span className="w-3 h-3 rounded-[3px] ring-2 ring-aliveDark bg-surface" />
        published
      </span>
      <span className="flex items-center gap-xs">
        <span className="w-3 h-3 rounded-[3px] ring-2 ring-ink bg-surface" />
        scheduled
      </span>
      <span className="flex items-center gap-xs">
        <span className="w-3 h-3 rounded-[3px] ring-2 ring-attentionBorder bg-surface" />
        review
      </span>
    </div>
  );
}

function formatStatus(it: DayItem): string {
  if (it.status === "PUBLISHED") {
    return it.publishedAt
      ? `published ${it.publishedAt.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })}`
      : "published";
  }
  if (it.status === "APPROVED") {
    return it.scheduledFor
      ? `scheduled ${it.scheduledFor.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })}`
      : "scheduled";
  }
  return it.status.toLowerCase();
}

// Pulls a thumbnail URL out of any draft format. Mirrors the helper
// in DraftCardV2's list-view but kept local so this component doesn't
// reach across folders.
function thumbnailFromContent(content: unknown): string | null {
  if (!content || typeof content !== "object") return null;
  const c = content as Record<string, unknown>;
  // SINGLE_POST + EMAIL
  const hero = c.heroImage as { url?: string } | undefined;
  if (hero?.url) return hero.url;
  // CAROUSEL — first slide with an image
  const cover = c.coverSlide as { imageUrl?: string } | undefined;
  if (cover?.imageUrl) return cover.imageUrl;
  const body = c.bodySlides as
    | Array<{ imageUrl?: string }>
    | undefined;
  if (body && body.length > 0) {
    const first = body.find((s) => s.imageUrl);
    if (first?.imageUrl) return first.imageUrl;
  }
  // REEL — first beat with an image
  const beats = c.beats as Array<{ imageUrl?: string }> | undefined;
  if (beats && beats.length > 0) {
    const first = beats.find((b) => b.imageUrl);
    if (first?.imageUrl) return first.imageUrl;
  }
  // STORY — first frame
  const frames = c.frames as Array<{ imageUrl?: string }> | undefined;
  if (frames && frames.length > 0) {
    const first = frames.find((f) => f.imageUrl);
    if (first?.imageUrl) return first.imageUrl;
  }
  if (typeof c.imageUrl === "string") return c.imageUrl;
  return null;
}

function captionFromContent(content: unknown): string {
  if (!content || typeof content !== "object") return "";
  const c = content as Record<string, unknown>;
  if (typeof c.caption === "string") return c.caption;
  if (typeof c.hook === "string") return c.hook;
  if (typeof c.body === "string") return c.body;
  if (typeof c.subject === "string") return c.subject;
  return "";
}
