import { z } from "zod";
import {
  db,
  Agent,
  FindingSeverity,
  type Prisma,
} from "@orb/db";
import { anthropic, jsonSchemaForAnthropic, MODELS } from "../services/anthropic";
import { fetchGoogleNews, type NewsItem } from "../services/news";
import { CREDIT_COSTS, consumeCredits } from "../services/quota";
import { SCOUT_SYSTEM_PROMPT } from "./prompts/scout";

const ScoutOutputSchema = z.object({
  observations: z.array(
    z.object({
      competitorId: z.string(),
      name: z.string(),
      watchFor: z.array(z.string()),
      recentIntuition: z.string().nullable(),
      surfaceableAsFinding: z.boolean(),
      findingSummary: z.string().nullable(),
      sourceUrl: z.string().nullable(),
    }),
  ),
});

export type ScoutOutput = z.infer<typeof ScoutOutputSchema>;

type CompetitorWithFeed = {
  id: string;
  name: string;
  handle: string | null;
  platform: string;
  feed: NewsItem[];
};

export async function runScout(args: {
  businessDescription: string;
  brandVoice: unknown;
  competitors: CompetitorWithFeed[];
}): Promise<ScoutOutput> {
  if (args.competitors.length === 0) {
    return { observations: [] };
  }

  const blocks = args.competitors.map((c) => {
    const feed =
      c.feed.length === 0
        ? "  (no recent news items found)"
        : c.feed
            .map(
              (n) =>
                `  - ${n.title}\n    source: ${n.source || "unknown"} · ${n.pubDate}\n    link: ${n.link}\n    snippet: ${n.snippet || "(no snippet)"}`,
            )
            .join("\n");
    return `Competitor:
  id: ${c.id}
  name: ${c.name}${c.handle ? `\n  handle: ${c.handle}` : ""}
  platform: ${c.platform}
  recent news feed:
${feed}`;
  });

  const userMessage = `Business:
${args.businessDescription || "(not set)"}

Brand voice fingerprint:
${JSON.stringify(args.brandVoice ?? {}, null, 2)}

Competitors being tracked (with recent news):

${blocks.join("\n\n")}

Produce one observation per competitor.`;

  const response = await anthropic().messages.create({
    model: MODELS.SONNET,
    max_tokens: 3000,
    system: [
      {
        type: "text",
        text: SCOUT_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
    output_config: {
      format: {
        type: "json_schema",
        schema: jsonSchemaForAnthropic(ScoutOutputSchema),
      },
    },
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error(
      `Scout returned no text content (stop_reason: ${response.stop_reason})`,
    );
  }

  const raw = JSON.parse(textBlock.text);
  return ScoutOutputSchema.parse(raw);
}

// Orchestration: fetch recent news per competitor, run Scout, persist findings
// + agent events. News fetch is best-effort per competitor — if one fails, the
// others still proceed.
export async function generateCompetitorIntel(
  userId: string,
): Promise<{ findingsCreated: number; newsItemsFetched: number }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      agentContext: true,
      competitors: true,
    },
  });
  if (!user) throw new Error("User not found");
  if (!user.agentContext?.strategistOutput) {
    throw new Error("Brand voice not set — run Strategist first");
  }
  if (user.competitors.length === 0) {
    return { findingsCreated: 0, newsItemsFetched: 0 };
  }

  await consumeCredits(userId, CREDIT_COSTS.SCOUT_RUN, "scout_run");

  const withFeeds: CompetitorWithFeed[] = await Promise.all(
    user.competitors.map(async (c) => {
      const query = `${c.name} announcement OR launch OR news`;
      const feed = await fetchGoogleNews(query, 4).catch((err) => {
        console.warn(`Scout news fetch failed for ${c.name}:`, err);
        return [] as NewsItem[];
      });
      return {
        id: c.id,
        name: c.name,
        handle: c.handle,
        platform: c.platform,
        feed,
      };
    }),
  );

  const newsItemsFetched = withFeeds.reduce((n, c) => n + c.feed.length, 0);

  const result = await runScout({
    businessDescription: user.businessDescription ?? "",
    brandVoice: user.agentContext.strategistOutput,
    competitors: withFeeds,
  });

  let findingsCreated = 0;
  for (const obs of result.observations) {
    const competitor = user.competitors.find((c) => c.id === obs.competitorId);
    if (!competitor) continue;

    await db.competitor.update({
      where: { id: competitor.id },
      data: {
        recentActivity: {
          watchFor: obs.watchFor,
          recentIntuition: obs.recentIntuition,
          sourceUrl: obs.sourceUrl,
          updatedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
        lastCheckedAt: new Date(),
      },
    });

    if (obs.surfaceableAsFinding && obs.findingSummary) {
      await db.finding.create({
        data: {
          userId,
          agent: Agent.SCOUT,
          severity: FindingSeverity.INFO,
          summary: obs.findingSummary,
          payload: {
            competitorId: competitor.id,
            competitorName: competitor.name,
            watchFor: obs.watchFor,
            sourceUrl: obs.sourceUrl,
          },
        },
      });
      findingsCreated++;
    }
  }

  await db.agentEvent.create({
    data: {
      userId,
      agent: Agent.SCOUT,
      eventType: "sweep_complete",
      payload: {
        competitorsChecked: user.competitors.length,
        findingsCreated,
        newsItemsFetched,
      },
    },
  });

  return { findingsCreated, newsItemsFetched };
}
