import { z } from "zod";
import { db, Agent, FindingSeverity } from "@orb/db";
import { anthropic, jsonSchemaForAnthropic, MODELS } from "../services/anthropic";
import { PULSE_SYSTEM_PROMPT } from "./prompts/pulse";

const PulseOutputSchema = z.object({
  signals: z.array(
    z.object({
      topic: z.string(),
      summary: z.string(),
      relevanceToBusiness: z.string(),
      severity: z.enum(["info", "act_fast"]),
      suggestedAction: z.string().nullable(),
    }),
  ),
});

export type PulseOutput = z.infer<typeof PulseOutputSchema>;

export async function runPulse(args: {
  businessDescription: string;
  brandVoice: unknown;
  currentDate?: Date;
}): Promise<PulseOutput> {
  const dateLine = args.currentDate
    ? `Current date: ${args.currentDate.toISOString().slice(0, 10)}`
    : "";

  const userMessage = `Business:
${args.businessDescription || "(not set)"}

Brand voice fingerprint:
${JSON.stringify(args.brandVoice ?? {}, null, 2)}

${dateLine}

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

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error(
      `Pulse returned no text content (stop_reason: ${response.stop_reason})`,
    );
  }

  const raw = JSON.parse(textBlock.text);
  return PulseOutputSchema.parse(raw);
}

// Orchestration: run Pulse for a given user, persist findings + agent events.
export async function generatePulseSignals(
  userId: string,
): Promise<{ findingsCreated: number }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { agentContext: true },
  });
  if (!user) throw new Error("User not found");
  if (!user.agentContext?.strategistOutput) {
    throw new Error("Brand voice not set — run Strategist first");
  }

  const result = await runPulse({
    businessDescription: user.businessDescription ?? "",
    brandVoice: user.agentContext.strategistOutput,
    currentDate: new Date(),
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
        },
      },
    });
  }

  await db.agentContext.update({
    where: { userId },
    data: {
      pulseSignals: {
        generatedAt: new Date().toISOString(),
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
      },
    },
  });

  return { findingsCreated: result.signals.length };
}
