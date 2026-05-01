import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@orb/auth/server";
import { trpcServer } from "../../../lib/trpc-server";
import { PageHero } from "../../../components/shared/page-hero";
import { GenerateBar } from "../../../components/content/generate-bar";
import { DraftsPanel } from "../../../components/content/drafts-panel";
import { WeekGrid } from "../../../components/content/week-grid";
import { PerformancePanel } from "../../../components/content/performance-panel";

// Content page — three views, selected via top tabs:
//   feed       — drafts feed (the default; what 90% of users come for)
//   week       — calendar of the week's plan + scheduled posts
//   performance — what's actually working
//
// GenerateBar at the very top is the single primary action; tabs
// just change what shows beneath it.

type Tab = "feed" | "week" | "performance";

function parseTab(value: string | string[] | undefined): Tab {
  if (value === "week" || value === "performance") return value;
  return "feed";
}

const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY_MS = 24 * 60 * 60 * 1000;

function shortPlatform(p: string): string {
  if (p === "INSTAGRAM") return "IG";
  if (p === "LINKEDIN") return "LI";
  if (p === "FACEBOOK") return "FB";
  if (p === "EMAIL") return "EMAIL";
  return p.slice(0, 2);
}

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/signin");

  const { tab: tabParam } = await searchParams;
  const tab = parseTab(tabParam);

  const trpc = await trpcServer();
  const [drafts, posts] = await Promise.all([
    trpc.content.listDrafts({ limit: 30 }),
    trpc.content.listPosts({ limit: 30 }),
  ]);

  const inFlight = drafts.items.filter(
    (d) => d.status === "DRAFT" || d.status === "AWAITING_REVIEW",
  ).length;
  const awaitingPhotos = drafts.items.filter(
    (d) => d.status === "AWAITING_PHOTOS",
  ).length;
  const approved = drafts.items.filter((d) => d.status === "APPROVED").length;

  // Build week-grid slots for the week view.
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS);

  type Slot = {
    day: string;
    dateNum: number;
    platform: string;
    status: "published" | "needs-you" | "drafted" | "quiet";
    title: string;
    metric: string;
    draftId?: string;
    postId?: string;
  };

  const slots: Slot[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart.getTime() + i * DAY_MS);
    const dayStart = d.getTime();
    const dayEnd = dayStart + DAY_MS;

    const post = posts.items.find((p) => {
      const t = p.publishedAt.getTime();
      return t >= dayStart && t < dayEnd;
    });
    const draft = drafts.items.find((d) => {
      if (!d.scheduledFor) return false;
      const t = d.scheduledFor.getTime();
      return t >= dayStart && t < dayEnd;
    });

    if (post) {
      const m = (post.metrics ?? {}) as { reach?: number };
      slots.push({
        day: DAY_LABELS[d.getDay()]!,
        dateNum: d.getDate(),
        platform: shortPlatform(post.platform),
        status: "published",
        title: `post ${post.externalId.slice(0, 12)}`,
        metric: m.reach ? `${m.reach.toLocaleString()} reach` : "published",
        postId: post.id,
      });
    } else if (draft) {
      const content = (draft.content ?? {}) as {
        caption?: string;
        hook?: string;
        subject?: string;
      };
      const title = (
        content.caption ?? content.hook ?? content.subject ?? "draft"
      ).slice(0, 40);
      const needsPhotos = draft.status === "AWAITING_PHOTOS";
      slots.push({
        day: DAY_LABELS[d.getDay()]!,
        dateNum: d.getDate(),
        platform: shortPlatform(draft.platform),
        status: needsPhotos ? "needs-you" : "drafted",
        title,
        metric: needsPhotos
          ? "awaiting photos"
          : draft.scheduledFor
            ? `scheduled ${draft.scheduledFor.toLocaleTimeString("en-US", {
                hour: "numeric",
              })}`
            : "drafted",
        draftId: draft.id,
      });
    } else {
      slots.push({
        day: DAY_LABELS[d.getDay()]!,
        dateNum: d.getDate(),
        platform: "",
        status: "quiet",
        title: "",
        metric: "",
      });
    }
  }

  const rangeLabel = `${weekStart
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase()} — ${new Date(weekEnd.getTime() - DAY_MS)
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase()}`;

  return (
    <div className="max-w-[760px] mx-auto flex flex-col gap-xl">
      <PageHero
        title="content"
        sub="tell adfi what to post — echo will draft it in your voice."
      />

      <GenerateBar />

      <div className="font-mono text-[11px] text-ink4 tracking-[0.18em] flex items-center gap-md flex-wrap">
        <span>{inFlight} IN-FLIGHT</span>
        {awaitingPhotos > 0 ? (
          <>
            <span className="text-ink5">·</span>
            <span className="text-attentionText">
              {awaitingPhotos} AWAITING PHOTOS
            </span>
          </>
        ) : null}
        {approved > 0 ? (
          <>
            <span className="text-ink5">·</span>
            <span>{approved} APPROVED</span>
          </>
        ) : null}
      </div>

      {/* Tab strip — feed / week / performance */}
      <div className="flex items-center gap-md hairline-bottom pb-md">
        <TabLink tab="feed" current={tab} label="feed" />
        <TabLink tab="week" current={tab} label="week" />
        <TabLink tab="performance" current={tab} label="performance" />
      </div>

      {tab === "week" ? (
        <WeekGrid rangeLabel={rangeLabel} slots={slots} />
      ) : tab === "performance" ? (
        <PerformancePanel />
      ) : (
        <DraftsPanel />
      )}
    </div>
  );
}

function TabLink({
  tab,
  current,
  label,
}: {
  tab: Tab;
  current: Tab;
  label: string;
}) {
  const isActive = tab === current;
  const href = tab === "feed" ? "/content" : `/content?tab=${tab}`;
  return (
    <Link
      href={href}
      className={`text-sm transition-colors ${
        isActive
          ? "text-ink font-medium"
          : "text-ink3 hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
}
