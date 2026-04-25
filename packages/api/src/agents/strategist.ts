import { z } from "zod";
import { Agent } from "@orb/db";
import {
  anthropic,
  jsonSchemaForAnthropic,
  MODELS,
  recordAnthropicUsage,
} from "../services/anthropic";
import {
  performanceForPrompt,
  type PerformanceSummary,
} from "../services/performance";
import { STRATEGIST_SYSTEM_PROMPT } from "./prompts/strategist";

const BrandVoiceSchema = z.object({
  voiceTone: z.array(z.string()).min(3).max(5),
  brandValues: z.array(z.string()).min(3).max(5),
  audienceSegments: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
      }),
    )
    .min(2)
    .max(3),
  contentPillars: z.array(z.string()).min(3).max(5),
  doNotDoList: z.array(z.string()).min(3).max(5),
});

export type BrandVoice = z.infer<typeof BrandVoiceSchema>;

export async function runStrategist(args: {
  businessDescription: string;
  goal: string;
  userId?: string;
  // When provided, Strategist refines this voice instead of starting fresh.
  previousVoice?: BrandVoice | null;
  // When provided, Strategist uses recent performance to nudge pillars/voice.
  performance?: PerformanceSummary | null;
}): Promise<BrandVoice> {
  const previousBlock = args.previousVoice
    ? `\n\nPrevious brand voice (refine this — don't reinvent):\n${JSON.stringify(args.previousVoice, null, 2)}`
    : "";
  const performanceBlock = args.performance
    ? `\n\nRecent performance:\n${performanceForPrompt(args.performance)}`
    : "";
  const userMessage = `Business description:\n${args.businessDescription}\n\nPrimary goal: ${args.goal}${previousBlock}${performanceBlock}`;

  const response = await anthropic().messages.create({
    model: MODELS.OPUS,
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: STRATEGIST_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
    output_config: {
      format: {
        type: "json_schema",
        schema: jsonSchemaForAnthropic(BrandVoiceSchema),
      },
    },
  });

  if (args.userId) {
    void recordAnthropicUsage({
      userId: args.userId,
      agent: Agent.STRATEGIST,
      eventType: "strategist_run",
      response,
    });
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error(
      `Strategist returned no text content (stop_reason: ${response.stop_reason})`,
    );
  }

  const raw = JSON.parse(textBlock.text);
  return BrandVoiceSchema.parse(raw);
}
