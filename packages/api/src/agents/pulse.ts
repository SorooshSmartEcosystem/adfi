import { z } from "zod";
import { db, Agent, FindingSeverity } from "@orb/db";
import {
  anthropic,
  jsonSchemaForAnthropic,
  MODELS,
  recordAnthropicUsage,
} from "../services/anthropic";
import { fetchNewsForQueries, type NewsItem } from "../services/news";
import { CREDIT_COSTS, consumeCredits } from "../services/quota";
import { PULSE_SYSTEM_PROMPT } from "./prompts/pulse";

const PulseOutputSchema = z.object({
  signals: z.array(
    z.object({
      topic: z.string(),
      summary: z.string(),
      relevanceToBusiness: z.string(),
      severity: z.enum(["info", "act_fast"]),
      suggestedAction: z.string().nullable(),
      sourceUrl: z.string().nullable(),
    }),
  ),
});

export type PulseOutput = z.infer<typeof PulseOutputSchema>;

export async function runPulse(args: {
  businessDescription: string;
  brandVoice: unknown;
  newsFeed: NewsItem[];
  currentDate?: Date;
  userId?: string;
}): Promise<PulseOutput> {
  const dateLine = args.currentDate
    ? `Current date: ${args.currentDate.toISOString().slice(0, 10)}`
    : "";

  const feedText =
    args.newsFeed.length === 0
      ? "(no news items collected today — rely on calendar/seasonal signals only)"
      : args.newsFeed
          .map(
            (n, i) =>
              `[${i + 1}] ${n.title}\n    source: ${n.source || "unknown"} · ${n.pubDate}\n    link: ${n.link}\n    snippet: ${n.snippet || "(no snippet)"}`,
          )
          .join("\n\n");

  const userMessage = `Business:
${args.businessDescription || "(not set)"}

Brand voice fingerprint:
${JSON.stringify(args.brandVoice ?? {}, null, 2)}

${dateLine}

News feed (pick from these first; only add calendar signals if truly nothing fits):
${feedText}

Surface the signals this solopreneur should know about this week.`;

  const response = await anthropic().messages.create({
    model: MODELS.SONNET,
    max_tokens: 2500,
    system: [
      {
        type: "text",
        text: PULSE_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
    output_config: {
      format: {
        type: "json_schema",
        schema: jsonSchemaForAnthropic(PulseOutputSchema),
      },
    },
  });

  if (args.userId) {
    void recordAnthropicUsage({
      userId: args.userId,
      agent: Agent.PULSE,
      eventType: "pulse_run",
      response,
      meta: { newsItems: args.newsFeed.length },
    });
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error(
      `Pulse returned no text content (stop_reason: ${response.stop_reason})`,
    );
  }

  const raw = JSON.parse(textBlock.text);
  return PulseOutputSchema.parse(raw);
}

// Derives 3–5 Google News search queries from the user's brand voice +
// business description. Falls back to a single generic query if the brand
// voice is sparse.
function deriveQueries(args: {
  businessDescription: string;
  brandVoice: unknown;
}): string[] {
  const bv = (args.brandVoice ?? {}) as {
    contentPillars?: string[];
    audienceSegments?: { name: string }[];
  };

  const pillars = (bv.contentPillars ?? []).slice(0, 3);
  const audiences = (bv.audienceSegments ?? []).slice(0, 2).map((a) => a.name);

  // Pull the first comma/period-delimited chunk of the business description
  // as a topical seed (typically the category: "handmade ceramics studio", etc.)
  const seed =
    args.businessDescription
      ?.split(/[.,\n]/)[0]
      ?.trim()
      .slice(0, 60) ?? "small business";

  const queries = [
    seed,
    ...pillars.map((p) => `${seed} ${p}`),
    ...audiences.map((a) => `${a} ${seed}`),
  ]
    .map((q) => q.trim())
    .filter((q) => q.length > 0);

  // Dedupe + cap
  return Array.from(new Set(queries)).slice(0, 5);
}

// Orchestration: fetch real news, run Pulse, persist findings + agent events.
export async function generatePulseSignals(
  userId: string,
): Promise<{ findingsCreated: number; newsItems: number }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { agentContexts: true },
  });
  if (!user) throw new Error("User not found");
  if (!user.agentContexts?.[0]?.strategistOutput) {
    throw new Error("Brand voice not set — run Strategist first");
  }

  await consumeCredits(userId, CREDIT_COSTS.PULSE_RUN, "pulse_run");

  const queries = deriveQueries({
    businessDescription: user.businessDescription ?? "",
    brandVoice: user.agentContexts?.[0]?.strategistOutput,
  });

  const newsFeed = await fetchNewsForQueries(queries, 5, 25).catch((err) => {
    // News fetch is best-effort; fall back to empty feed so Claude can still
    // return calendar signals if available.
    console.warn("Pulse news fetch failed:", err);
    return [] as NewsItem[];
  });

  const result = await runPulse({
    businessDescription: user.businessDescription ?? "",
    brandVoice: user.agentContexts?.[0]?.strategistOutput,
    newsFeed,
    currentDate: new Date(),
    userId,
  });

  for (const signal of result.signals) {
    await db.finding.create({
      data: {
        userId,
        agent: Agent.PULSE,
        severity:
          signal.severity === "act_fast"
            ? FindingSeverity.NEEDS_ATTENTION
            : FindingSeverity.INFO,
        summary: signal.topic,
        payload: {
          summary: signal.summary,
          relevance: signal.relevanceToBusiness,
          suggestedAction: signal.suggestedAction,
          sourceUrl: signal.sourceUrl,
        },
      },
    });
  }

  // Multi-business: write to every AgentContext owned by this user
  // (in practice, single-business users have 1; STUDIO/AGENCY users
  // have 1 per business). Per-business iteration of pulse is parked
  // work — for now all of a user's businesses share the same signal
  // feed.
  await db.agentContext.updateMany({
    where: { userId },
    data: {
      pulseSignals: {
        generatedAt: new Date().toISOString(),
        queries,
        newsItems: newsFeed.length,
        signals: result.signals,
      } as object,
    },
  });

  await db.agentEvent.create({
    data: {
      userId,
      agent: Agent.PULSE,
      eventType: "sweep_complete",
      payload: {
        signalsCount: result.signals.length,
        queriesRun: queries.length,
        newsItemsFetched: newsFeed.length,
      },
    },
  });

  return { findingsCreated: result.signals.length, newsItems: newsFeed.length };
}
