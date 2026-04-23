import { z } from "zod";
import {
  db,
  Agent,
  FindingSeverity,
  type Prisma,
} from "@orb/db";
import { anthropic, jsonSchemaForAnthropic, MODELS } from "../services/anthropic";
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
    }),
  ),
});

export type ScoutOutput = z.infer<typeof ScoutOutputSchema>;

export async function runScout(args: {
  businessDescription: string;
  brandVoice: unknown;
  competitors: {
    id: string;
    name: string;
    handle: string | null;
    platform: string;
  }[];
}): Promise<ScoutOutput> {
  if (args.competitors.length === 0) {
    return { observations: [] };
  }

  const competitorsList = args.competitors
    .map(
      (c) =>
        `- id: ${c.id}, name: ${c.name}${c.handle ? `, handle: ${c.handle}` : ""} (${c.platform})`,
    )
    .join("\n");

  const userMessage = `Business:
${args.businessDescription || "(not set)"}

Brand voice fingerprint:
${JSON.stringify(args.brandVoice ?? {}, null, 2)}

Competitors being tracked:
${competitorsList}

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

// Orchestration: run Scout for a given user, persist findings + agent events.
export async function generateCompetitorIntel(
  userId: string,
): Promise<{ findingsCreated: number }> {
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
    return { findingsCreated: 0 };
  }

  const result = await runScout({
    businessDescription: user.businessDescription ?? "",
    brandVoice: user.agentContext.strategistOutput,
    competitors: user.competitors.map((c) => ({
      id: c.id,
      name: c.name,
      handle: c.handle,
      platform: c.platform,
    })),
  });

  // Update each competitor's recentActivity with their watchFor list, and
  // create findings for surfaceable observations.
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
      },
    },
  });

  return { findingsCreated };
}
