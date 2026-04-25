import Anthropic from "@anthropic-ai/sdk";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { z } from "zod";

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY must be set to use the Anthropic service",
      );
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export const MODELS = {
  OPUS: process.env.ANTHROPIC_MODEL_OPUS ?? "claude-opus-4-7",
  SONNET: process.env.ANTHROPIC_MODEL_SONNET ?? "claude-sonnet-4-6",
  HAIKU: process.env.ANTHROPIC_MODEL_HAIKU ?? "claude-haiku-4-5",
} as const;

// Converts a zod schema to the JSON Schema shape Anthropic's structured output
// accepts. Strips constraints Anthropic rejects (notably array minItems/maxItems
// other than 0/1). zod still validates these at runtime after the response.
export function jsonSchemaForAnthropic(
  schema: z.ZodTypeAny,
): Record<string, unknown> {
  const raw = zodToJsonSchema(schema, { target: "openApi3" }) as Record<
    string,
    unknown
  >;
  return stripUnsupportedConstraints(raw) as Record<string, unknown>;
}

const UNSUPPORTED_CONSTRAINTS = new Set([
  // arrays
  "minItems",
  "maxItems",
  // numbers / integers
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  // strings
  "minLength",
  "maxLength",
  "pattern",
]);

function stripUnsupportedConstraints(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripUnsupportedConstraints);
  }
  if (value === null || typeof value !== "object") return value;
  const obj = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(obj)) {
    if (UNSUPPORTED_CONSTRAINTS.has(key)) continue;
    result[key] = stripUnsupportedConstraints(v);
  }
  return result;
}

// =============================================================
// Usage logging — agents call this after every Anthropic response so
// admin financials read real costs, not estimates. Best-effort:
// never throws into the caller.
// =============================================================

// Loose because the SDK's Message type evolves and we don't want to pin
// internal types here — we only read 4 fields.
type AnthropicResponseLike = {
  model?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number | null;
    cache_creation_input_tokens?: number | null;
  } | null;
};

export async function recordAnthropicUsage(args: {
  userId: string;
  agent: import("@orb/db").Agent;
  eventType: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  response: any;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const r = args.response as AnthropicResponseLike;
  // Lazy imports avoid a circular dep with services/pricing.ts.
  const { db } = await import("@orb/db");
  const { estimateAnthropicCostCents, MODEL_PRICING } = await import("./pricing");

  const usage = r.usage ?? {};
  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  const cacheReadTokens = usage.cache_read_input_tokens ?? 0;
  const cacheCreationTokens = usage.cache_creation_input_tokens ?? 0;

  const model = r.model ?? "";
  const knownModel =
    model in MODEL_PRICING ? (model as keyof typeof MODEL_PRICING) : null;
  const costCents = knownModel
    ? estimateAnthropicCostCents({
        model: knownModel,
        inputTokens,
        outputTokens,
      })
    : 0;

  try {
    await db.agentEvent.create({
      data: {
        userId: args.userId,
        agent: args.agent,
        eventType: args.eventType,
        payload: {
          model,
          inputTokens,
          outputTokens,
          cacheReadTokens,
          cacheCreationTokens,
          costCents,
          ...args.meta,
        },
      },
    });
  } catch (err) {
    console.warn("recordAnthropicUsage failed:", err);
  }
}
