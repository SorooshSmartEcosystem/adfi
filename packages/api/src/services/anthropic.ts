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
