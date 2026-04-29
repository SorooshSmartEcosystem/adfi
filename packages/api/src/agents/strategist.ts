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

  // Detect the user's writing language and pin every prose-style
  // output field to it. Belt-and-braces with the system prompt's
  // LANGUAGE rule — Opus on a JSON schema with English field names
  // (voiceTone, brandValues, etc.) defaults to English values unless
  // we're forceful and explicit, especially for short descriptions.
  const lang = detectLanguage(args.businessDescription);
  const langDirective =
    lang.code === "en"
      ? ""
      : `\n\n=== LANGUAGE LOCK ===\nThe business description above is in ${lang.label}. EVERY string in your response — every entry of voiceTone, brandValues, contentPillars, doNotDoList, every audienceSegments[i].name and audienceSegments[i].description — MUST be written in ${lang.label}. Do not write a single word in English. Do not use English transliterations. Do not produce English persona names like "The Signal Sharer" — render them in ${lang.label}. The downstream agents will read this fingerprint and write content in the language you choose here. Choose ${lang.label}.`;

  const userMessage = `Business description:\n${args.businessDescription}\n\nPrimary goal: ${args.goal}${previousBlock}${performanceBlock}${langDirective}`;

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

// Lightweight script-based language detector. We don't need a full NLP
// library — checking which Unicode block dominates the input is enough
// to distinguish the languages where Opus's English bias actually
// bites (Farsi, Arabic, Hebrew, Chinese, Japanese, Korean, Cyrillic,
// Thai, Devanagari, etc.). For Latin-script non-English (Spanish,
// French, etc.) Opus follows the system prompt's language rule fine
// without an extra directive — those return `en` here as a no-op.
function detectLanguage(text: string): { code: string; label: string } {
  const counts = {
    arabicFarsi: 0, // ؀-ۿ — Arabic + Farsi share this block
    hebrew: 0, // ֐-׿
    cjkHan: 0, // 一-鿿 — Chinese + Japanese kanji + Korean hanja
    hiragana: 0, // ぀-ゟ
    katakana: 0, // ゠-ヿ
    hangul: 0, // 가-힯
    cyrillic: 0, // Ѐ-ӿ
    thai: 0, // ฀-๿
    devanagari: 0, // ऀ-ॿ
    latin: 0, // basic Latin letters
  };
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;
    if (cp >= 0x0600 && cp <= 0x06ff) counts.arabicFarsi++;
    else if (cp >= 0x0590 && cp <= 0x05ff) counts.hebrew++;
    else if (cp >= 0x4e00 && cp <= 0x9fff) counts.cjkHan++;
    else if (cp >= 0x3040 && cp <= 0x309f) counts.hiragana++;
    else if (cp >= 0x30a0 && cp <= 0x30ff) counts.katakana++;
    else if (cp >= 0xac00 && cp <= 0xd7af) counts.hangul++;
    else if (cp >= 0x0400 && cp <= 0x04ff) counts.cyrillic++;
    else if (cp >= 0x0e00 && cp <= 0x0e7f) counts.thai++;
    else if (cp >= 0x0900 && cp <= 0x097f) counts.devanagari++;
    else if ((cp >= 65 && cp <= 90) || (cp >= 97 && cp <= 122)) counts.latin++;
  }
  // Whichever non-Latin script has the most characters wins, IF it
  // outnumbers Latin chars (heuristic: a Farsi description will have
  // way more Farsi than English even with embedded English brand names).
  type Match = { code: string; label: string; n: number };
  const candidates: Match[] = [
    { code: "fa-or-ar", label: "Arabic or Farsi (whichever the description uses)", n: counts.arabicFarsi },
    { code: "he", label: "Hebrew", n: counts.hebrew },
    { code: "zh", label: "Chinese (Simplified or Traditional, whichever the description uses)", n: counts.cjkHan },
    { code: "ja", label: "Japanese", n: counts.hiragana + counts.katakana + counts.cjkHan },
    { code: "ko", label: "Korean", n: counts.hangul },
    { code: "ru-or-sr", label: "Cyrillic-script language (Russian, Serbian, Ukrainian, etc.)", n: counts.cyrillic },
    { code: "th", label: "Thai", n: counts.thai },
    { code: "hi", label: "Hindi or another Devanagari-script language", n: counts.devanagari },
  ];
  // Japanese requires hiragana or katakana to disambiguate from Chinese.
  if (counts.hiragana === 0 && counts.katakana === 0) {
    const ja = candidates.find((c) => c.code === "ja");
    if (ja) ja.n = 0;
  }
  const winner = candidates.reduce<Match>(
    (best, c) => (c.n > best.n ? c : best),
    { code: "en", label: "English", n: 0 },
  );
  if (winner.n > counts.latin / 2) return winner;
  return { code: "en", label: "English" };
}
