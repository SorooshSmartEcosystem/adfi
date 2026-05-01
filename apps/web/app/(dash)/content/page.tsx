import { redirect } from "next/navigation";
import { getCurrentUser } from "@orb/auth/server";
import { trpcServer } from "../../../lib/trpc-server";
import { GenerateBar } from "../../../components/content/generate-bar";
import { ContentTabsClient } from "../../../components/content/content-tabs-client";

// Content page — minimal layout:
//   1. tabs at the very top (feed / week / performance)
//   2. GenerateBar (the single primary action)
//   3. tab content
//
// Tabs are client-side (no full server roundtrip on switch). Each
// tab's panel mounts lazily on first view. No status counts above
// the feed — every draft card carries its own state pill so the
// info isn't repeated.

const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY_MS = 24 * 60 * 60 * 1000;

type Tab = "feed" | "week" | "performance";

function parseTab(value: string | string[] | undefined): Tab {
  if (value === "week" || value === "performance") return value;
  return "feed";
}

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
  const initialTab = parseTab(tabParam);

  const trpc = await trpcServer();
  // Build the week-grid slots server-side so the week tab is data-
  // ready when first viewed. Cheap query, runs at request time.
  const [drafts, posts] = await Promise.all([
    trpc.content.listDrafts({ limit: 30 }),
    trpc.content.listPosts({ limit: 30 }),
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
    <div className="max-w-[1100px] mx-auto flex flex-col gap-lg">
      <ContentTabsClient
        initialTab={initialTab}
        weekRangeLabel={rangeLabel}
        weekSlots={slots}
        headerSlot={<GenerateBar />}
      />
    </div>
  );
}
