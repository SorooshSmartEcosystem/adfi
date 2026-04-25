import { redirect } from "next/navigation";
import { createServerClient } from "@orb/auth/server";
import { trpcServer } from "../../../lib/trpc-server";
import { WeekGrid } from "../../../components/content/week-grid";
import { PerformanceCards } from "../../../components/content/performance-cards";
import { ContentTabs } from "../../../components/content/tabs";
import { DraftsPanel } from "../../../components/content/drafts-panel";
import { PlanPanel } from "../../../components/content/plan-panel";
import { PerformancePanel } from "../../../components/content/performance-panel";

type Tab = "week" | "drafts" | "performance";

function parseTab(value: string | string[] | undefined): Tab {
  if (value === "drafts" || value === "performance") return value;
  return "week";
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
  const supabase = await createServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/signin");

  const { tab: tabParam } = await searchParams;
  const tab = parseTab(tabParam);

  const trpc = await trpcServer();
  const [drafts, posts] = await Promise.all([
    trpc.content.listDrafts({ limit: 50 }),
    trpc.content.listPosts({ limit: 50 }),
  ]);

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
      });
    } else if (draft) {
      const content = (draft.content ?? {}) as { caption?: string };
      const title = content.caption?.slice(0, 40) ?? "draft";
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
            ? `scheduled ${draft.scheduledFor.toLocaleTimeString("en-US", { hour: "numeric" })}`
            : "drafted",
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

  const monthAgo = Date.now() - 30 * DAY_MS;
  const recentPosts = posts.items.filter(
    (p) => p.publishedAt.getTime() >= monthAgo,
  );
  const bestPost = recentPosts
    .map((p) => ({
      platform: p.platform,
      title: `${p.platform.toLowerCase()} post`,
      publishedAt: p.publishedAt,
      reach: ((p.metrics ?? {}) as { reach?: number }).reach ?? 0,
    }))
    .sort((a, b) => b.reach - a.reach)[0];

  const pendingDrafts = drafts.items.filter(
    (d) => d.status === "AWAITING_REVIEW" || d.status === "AWAITING_PHOTOS",
  ).length;

  return (
    <>
      <ContentTabs active={tab} draftsCount={pendingDrafts} />

      {tab === "drafts" ? (
        <DraftsPanel />
      ) : tab === "performance" ? (
        <PerformancePanel />
      ) : (
        <>
          <div className="mb-xl">
            <PlanPanel />
          </div>
          <div className="font-mono text-sm text-ink4 tracking-[0.2em] mb-md mt-2xl">
            CALENDAR · {rangeLabel}
          </div>
          <div className="mb-xl">
            <WeekGrid rangeLabel={rangeLabel} slots={slots} />
          </div>
          <PerformanceCards bestPost={bestPost ?? null} insights={[]} />
        </>
      )}
    </>
  );
}
