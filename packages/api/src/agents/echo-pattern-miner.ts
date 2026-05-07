// Weekly Echo pattern miner.
//
// For each business with ≥ MIN_POSTS published posts in the window, runs
// ONE Haiku call comparing top-half vs bottom-half by reach and asks the
// model to extract structural / opener / topic patterns that separate
// the two. The output is written to AgentContext.echoPatterns and read
// by Echo on every subsequent draft.
//
// Cost: ~1¢ per business per week. No per-draft LLM call increase.
//
// Limitations (be honest with yourself before reading too much into
// the output):
// - We only have `reach` today. No saves / DMs / clicks. So "winning"
//   here means "got more eyeballs," not "drove more leads." When the
//   metrics ingestion expands (Level 3), the ranking switches to a
//   composite conversion score.
// - Below MIN_POSTS the miner skips the business — too few samples to
//   say anything useful. Expect new businesses to have null patterns
//   for 2-3 weeks of posting cadence.

import { z } from "zod";
import { db, Agent, Prisma } from "@orb/db";
import {
  anthropic,
  jsonSchemaForAnthropic,
  MODELS,
  recordAnthropicUsage,
} from "../services/anthropic";

const MIN_POSTS = 5;
const WINDOW_DAYS = 60;

const PatternMinerOutput = z.object({
  winningPatterns: z.array(z.string()),
  losingPatterns: z.array(z.string()),
  notes: z.string(),
});

const SYSTEM_PROMPT = `You analyze a single business's published social posts and extract the structural patterns that separate top performers from low performers. You are NOT writing copy — you are writing rules a copywriter (Echo) will read before drafting the next post.

You will receive two lists of posts for one business:
- TOP HALF — above-median reach
- BOTTOM HALF — below-median reach

Look for differences in:
- Hook shape (fragment / question / stat / scene / claim / metaphor)
- Body shape (vignette / argument / list / comparison / reflection)
- Specificity (named people, exact numbers, places, prices vs. abstractions)
- Length and rhythm
- Topic angle (what kind of subject lands vs. flops for THIS specific business)
- Closer style (aphorism / observation / no closer / question)

Return 3–6 winning patterns and 3–6 losing patterns. Each is a SHORT, ACTIONABLE rule a copywriter can apply. Examples of good rules:
- "Open with a fragment, not a complete sentence."
- "Posts naming a specific client/customer outperform 'a client' references."
- "Avoid three-numbered-list bodies — top posts use prose."
- "Posts under 80 words outperform posts over 200 words."
- "Closers ending with a question underperform — let the post land on a noun."

Examples of bad rules (too vague — don't write these):
- "Be more engaging."
- "Use stronger hooks."
- "Make it relatable."

Be honest. If the sample is small or the signal is weak, say so in notes. Don't fabricate patterns to fill the array — better to return 3 sharp rules than 6 fuzzy ones. Reach is the only metric available today, so your patterns describe what gets EYEBALLS, not what gets LEADS — flag this in notes if it matters.`;

type PostRecord = {
  caption: string;
  format: string;
  reach: number;
  publishedAt: Date;
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
  if (typeof c.hook === "string") return c.hook;
  return "";
}

function formatPostsForPrompt(posts: PostRecord[]): string {
  return posts
    .map(
      (p, i) =>
        `${i + 1}. [${p.format} · reach ${p.reach.toLocaleString()}] ${p.caption.slice(0, 400).replace(/\s+/g, " ").trim()}`,
    )
    .join("\n\n");
}

// Mines patterns for ONE business. Skips silently if not enough data.
export async function mineEchoPatternsForBusiness(args: {
  userId: string;
  businessId: string;
}): Promise<{ status: "skipped"; reason: string } | { status: "ok"; n: number }> {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const posts = await db.contentPost.findMany({
    where: {
      businessId: args.businessId,
      publishedAt: { gte: since },
    },
    orderBy: { publishedAt: "desc" },
    select: {
      publishedAt: true,
      metrics: true,
      draft: { select: { content: true, format: true } },
    },
  });

  const records: PostRecord[] = [];
  for (const p of posts) {
    const m = (p.metrics ?? {}) as { reach?: number };
    const caption = captionFromContent(p.draft.content);
    const reach = m.reach ?? 0;
    if (!caption || reach <= 0) continue;
    records.push({
      caption,
      format: String(p.draft.format),
      reach,
      publishedAt: p.publishedAt,
    });
  }

  if (records.length < MIN_POSTS) {
    return {
      status: "skipped",
      reason: `only ${records.length} posts with reach > 0; need ≥ ${MIN_POSTS}`,
    };
  }

  // Split by median reach. Equal halves when even count; the median post
  // goes to TOP when count is odd (so the bottom-half is the smaller
  // group when we're tied — the model handles this fine).
  const sorted = [...records].sort((a, b) => b.reach - a.reach);
  const half = Math.ceil(sorted.length / 2);
  const top = sorted.slice(0, half);
  const bottom = sorted.slice(half);

  const userMessage = `TOP HALF (${top.length} posts, reach ${top[top.length - 1]!.reach.toLocaleString()} – ${top[0]!.reach.toLocaleString()}):
${formatPostsForPrompt(top)}

BOTTOM HALF (${bottom.length} posts, reach ${bottom[bottom.length - 1]?.reach.toLocaleString() ?? "—"} – ${bottom[0]?.reach.toLocaleString() ?? "—"}):
${formatPostsForPrompt(bottom)}

Extract the patterns. Return JSON matching the schema.`;

  const response = await anthropic().messages.create({
    model: MODELS.HAIKU,
    max_tokens: 1500,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
    output_config: {
      format: {
        type: "json_schema",
        schema: jsonSchemaForAnthropic(PatternMinerOutput),
      },
    },
  });

  void recordAnthropicUsage({
    userId: args.userId,
    agent: Agent.ECHO,
    eventType: "echo_pattern_mine",
    response,
    meta: { businessId: args.businessId, n: records.length },
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error(
      `Pattern miner returned no text content (stop_reason: ${response.stop_reason})`,
    );
  }
  const parsed = PatternMinerOutput.parse(JSON.parse(textBlock.text));

  const persisted = {
    winning: parsed.winningPatterns,
    losing: parsed.losingPatterns,
    notes: parsed.notes,
    sample: {
      n: records.length,
      topReach: top[0]!.reach,
      bottomReach: bottom[bottom.length - 1]?.reach ?? 0,
    },
    updatedAt: new Date().toISOString(),
  };

  await db.agentContext.update({
    where: { businessId: args.businessId },
    data: { echoPatterns: persisted as unknown as Prisma.InputJsonValue },
  });

  await db.agentEvent.create({
    data: {
      userId: args.userId,
      agent: Agent.ECHO,
      eventType: "echo_patterns_updated",
      payload: {
        businessId: args.businessId,
        n: records.length,
        winningCount: parsed.winningPatterns.length,
        losingCount: parsed.losingPatterns.length,
      },
    },
  });

  return { status: "ok", n: records.length };
}

// Wrapper that mines patterns for every business owned by a single user.
// Matches the (userId) => Promise<unknown> signature expected by the
// runAgentForAllEligibleUsers cron runner.
export async function mineEchoPatternsForUser(userId: string): Promise<void> {
  const businesses = await db.business.findMany({
    where: { userId, deletedAt: null },
    select: { id: true },
  });
  for (const b of businesses) {
    try {
      await mineEchoPatternsForBusiness({ userId, businessId: b.id });
    } catch (err) {
      console.warn(
        `[echo-pattern-miner] business ${b.id} failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

// Read helper for runEcho — returns the persisted shape or null.
export type EchoPatterns = {
  winning: string[];
  losing: string[];
  notes?: string;
};

export function readEchoPatterns(raw: unknown): EchoPatterns | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const winning = Array.isArray(r.winning)
    ? r.winning.filter((s): s is string => typeof s === "string")
    : [];
  const losing = Array.isArray(r.losing)
    ? r.losing.filter((s): s is string => typeof s === "string")
    : [];
  if (winning.length === 0 && losing.length === 0) return null;
  const out: EchoPatterns = { winning, losing };
  if (typeof r.notes === "string" && r.notes) out.notes = r.notes;
  return out;
}
