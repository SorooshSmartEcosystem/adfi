import { z } from "zod";
import { Agent } from "@orb/db";
import {
  anthropic,
  jsonSchemaForAnthropic,
  MODELS,
  recordAnthropicUsage,
} from "../services/anthropic";
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
}): Promise<BrandVoice> {
  const userMessage = `Business description:\n${args.businessDescription}\n\nPrimary goal: ${args.goal}`;

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
