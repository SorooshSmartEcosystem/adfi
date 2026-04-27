// Aggregates ContentPost metrics into a structured summary that Planner +
// Echo can consume. Kept dependency-free + pure where possible so we can
// unit-test it later without spinning up Prisma.

import { db } from "@orb/db";

export type PostSummary = {
  caption: string;
  format: string;
  pillar?: string;
  reach: number;
  publishedAt: Date;
};

export type Bucket = {
  count: number;
  avgReach: number;
  totalReach: number;
  topPost: PostSummary | null;
};

export type PerformanceSummary = {
  totalPosts: number;
  overall: Bucket;
  byFormat: Record<string, Bucket>;
  byPillar: Record<string, Bucket>;
  topPosts: PostSummary[];
  underperformers: PostSummary[];
  windowDays: number;
};

function captionFromContent(content: unknown): string {
  if (!content || typeof content !== "object") return "";
  const c = content as Record<string, unknown>;
  if (typeof c.caption === "string" && c.caption) return c.caption;
  if (typeof c.body === "string" && c.body) return c.body;
  if (typeof c.subject === "string" && c.subject) return c.subject;
  if (
    c.coverSlide &&
    typeof c.coverSlide === "object" &&
    typeof (c.coverSlide as Record<string, unknown>).title === "string"
  ) {
    return (c.coverSlide as { title: string }).title;
  }
  return "";
}

function pillarFromContent(content: unknown): string | undefined {
  if (!content || typeof content !== "object") return undefined;
  const c = content as Record<string, unknown>;
  if (
    c.brief &&
    typeof c.brief === "object" &&
    typeof (c.brief as Record<string, unknown>).pillar === "string"
  ) {
    return (c.brief as { pillar: string }).pillar;
  }
  return undefined;
}

function bucketize(posts: PostSummary[]): Bucket {
  if (posts.length === 0) {
    return { count: 0, avgReach: 0, totalReach: 0, topPost: null };
  }
  const totalReach = posts.reduce((s, p) => s + p.reach, 0);
  const top = posts.reduce((best, p) => (p.reach > best.reach ? p : best));
  return {
    count: posts.length,
    avgReach: Math.round(totalReach / posts.length),
    totalReach,
    topPost: top,
  };
}

export async function summarizePerformance(
  userId: string,
  windowDays = 90,
  platform?: string,
): Promise<PerformanceSummary> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const posts = await db.contentPost.findMany({
    where: {
      userId,
      publishedAt: { gte: since },
      ...(platform &&
        platform !== "ALL" && {
          // Cast — Platform is an enum; the caller validates.
          platform: platform as never,
        }),
    },
    orderBy: { publishedAt: "desc" },
    select: {
      publishedAt: true,
      metrics: true,
      draft: { select: { content: true, format: true } },
    },
  });

  const summaries: PostSummary[] = posts
    .map((p) => {
      const m = (p.metrics ?? {}) as { reach?: number };
      const caption = captionFromContent(p.draft.content);
      const pillar = pillarFromContent(p.draft.content);
      if (!caption) return null;
      const item: PostSummary = {
        caption,
        format: p.draft.format,
        reach: m.reach ?? 0,
        publishedAt: p.publishedAt,
        ...(pillar && { pillar }),
      };
      return item;
    })
    .filter((p): p is PostSummary => p !== null);

  const byFormat: Record<string, Bucket> = {};
  const byPillar: Record<string, Bucket> = {};

  const formatGroups = new Map<string, PostSummary[]>();
  const pillarGroups = new Map<string, PostSummary[]>();
  for (const p of summaries) {
    if (!formatGroups.has(p.format)) formatGroups.set(p.format, []);
    formatGroups.get(p.format)!.push(p);
    if (p.pillar) {
      if (!pillarGroups.has(p.pillar)) pillarGroups.set(p.pillar, []);
      pillarGroups.get(p.pillar)!.push(p);
    }
  }
  for (const [k, v] of formatGroups) byFormat[k] = bucketize(v);
  for (const [k, v] of pillarGroups) byPillar[k] = bucketize(v);

  const topPosts = [...summaries]
    .sort((a, b) => b.reach - a.reach)
    .slice(0, 3);
  const underperformers = [...summaries]
    .filter((p) => p.reach > 0)
    .sort((a, b) => a.reach - b.reach)
    .slice(0, 2);

  return {
    totalPosts: summaries.length,
    overall: bucketize(summaries),
    byFormat,
    byPillar,
    topPosts,
    underperformers,
    windowDays,
  };
}

// Compact, prompt-friendly serialization. Keeps the LLM input short while
// preserving the comparative information (averages by format/pillar).
export function performanceForPrompt(summary: PerformanceSummary): string {
  if (summary.totalPosts === 0) {
    return "(no performance data yet — this is the first cycle)";
  }
  const lines: string[] = [
    `Window: last ${summary.windowDays} days · ${summary.totalPosts} posts · avg reach ${summary.overall.avgReach.toLocaleString()}`,
  ];

  if (Object.keys(summary.byFormat).length > 0) {
    lines.push("\nBy format:");
    for (const [fmt, b] of Object.entries(summary.byFormat)) {
      const ratio =
        summary.overall.avgReach > 0
          ? (b.avgReach / summary.overall.avgReach).toFixed(2)
          : "—";
      lines.push(
        `  - ${fmt}: ${b.count} posts · avg ${b.avgReach.toLocaleString()} (${ratio}× overall)`,
      );
    }
  }
  if (Object.keys(summary.byPillar).length > 0) {
    lines.push("\nBy pillar:");
    for (const [pil, b] of Object.entries(summary.byPillar)) {
      const ratio =
        summary.overall.avgReach > 0
          ? (b.avgReach / summary.overall.avgReach).toFixed(2)
          : "—";
      lines.push(
        `  - ${pil}: ${b.count} posts · avg ${b.avgReach.toLocaleString()} (${ratio}× overall)`,
      );
    }
  }
  if (summary.topPosts.length > 0) {
    lines.push("\nTop performers:");
    for (const p of summary.topPosts) {
      lines.push(
        `  - [${p.format}${p.pillar ? ` · ${p.pillar}` : ""}] reach ${p.reach.toLocaleString()} — "${p.caption.slice(0, 100)}"`,
      );
    }
  }
  if (summary.underperformers.length > 0) {
    lines.push("\nWeakest recent posts:");
    for (const p of summary.underperformers) {
      lines.push(
        `  - [${p.format}${p.pillar ? ` · ${p.pillar}` : ""}] reach ${p.reach.toLocaleString()} — "${p.caption.slice(0, 100)}"`,
      );
    }
  }
  return lines.join("\n");
}
