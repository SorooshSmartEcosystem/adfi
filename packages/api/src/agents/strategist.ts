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

// Model-side schema (what we tell Anthropic to constrain to). Generous
// upper bounds because Opus consistently produces 6–7 items even when we
// ask for 5 — fighting the prompt is wasted tokens. We trim to the UI
// caps in code below.
const BrandVoiceSchema = z.object({
  voiceTone: z.array(z.string()).min(3).max(8),
  brandValues: z.array(z.string()).min(3).max(8),
  audienceSegments: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
      }),
    )
    .min(2)
    .max(4),
  contentPillars: z.array(z.string()).min(3).max(8),
  doNotDoList: z.array(z.string()).min(3).max(8),
});

export type BrandVoice = z.infer<typeof BrandVoiceSchema>;

// Hard caps applied after parse. Keeps the rest of the app's UI / prompt
// budgets predictable regardless of how chatty the model felt.
const UI_CAPS = {
  voiceTone: 5,
  brandValues: 5,
  audienceSegments: 3,
  contentPillars: 5,
  doNotDoList: 5,
} as const;

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
  const parsed = BrandVoiceSchema.parse(raw);
  return {
    voiceTone: parsed.voiceTone.slice(0, UI_CAPS.voiceTone),
    brandValues: parsed.brandValues.slice(0, UI_CAPS.brandValues),
    audienceSegments: parsed.audienceSegments.slice(0, UI_CAPS.audienceSegments),
    contentPillars: parsed.contentPillars.slice(0, UI_CAPS.contentPillars),
    doNotDoList: parsed.doNotDoList.slice(0, UI_CAPS.doNotDoList),
  };
}
