import { z } from "zod";
import {
  db,
  Agent,
  DraftStatus,
  Platform,
  type Prisma,
} from "@orb/db";
import { anthropic, jsonSchemaForAnthropic, MODELS } from "../services/anthropic";
import { ECHO_SYSTEM_PROMPT } from "./prompts/echo";

const EchoOutputSchema = z.object({
  caption: z.string().min(20).max(2200),
  hashtags: z.array(z.string()).min(3).max(8),
  pillar: z.string().min(1).max(60),
  voiceMatchConfidence: z.number().min(0).max(1),
});

export type EchoOutput = z.infer<typeof EchoOutputSchema>;

export async function runEcho(args: {
  businessDescription: string;
  brandVoice: unknown;
  recentCaptions: string[];
  hint?: string;
}): Promise<EchoOutput> {
  const recentText =
    args.recentCaptions.length > 0
      ? args.recentCaptions.map((c, i) => `${i + 1}. ${c}`).join("\n\n")
      : "(no recent posts)";

  const userMessage = `Business description:
${args.businessDescription || "(not set)"}

Brand voice fingerprint:
${JSON.stringify(args.brandVoice ?? {}, null, 2)}

Recent post captions (avoid repeating themes):
${recentText}

${args.hint ? `Owner hint for this post: ${args.hint}` : ""}

Write the next post.`;

  const response = await anthropic().messages.create({
    model: MODELS.OPUS,
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: ECHO_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
    output_config: {
      format: {
        type: "json_schema",
        schema: jsonSchemaForAnthropic(EchoOutputSchema),
      },
    },
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error(
      `Echo returned no text content (stop_reason: ${response.stop_reason})`,
    );
  }

  const raw = JSON.parse(textBlock.text);
  return EchoOutputSchema.parse(raw);
}

// Orchestration: generate one new draft for the given user. Called by
// `content.generate` tRPC procedure, scheduled cron, or regenerate flows.
export async function generateDailyContent(
  userId: string,
  hint?: string,
): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { agentContext: true },
  });
  if (!user) throw new Error("User not found");
  if (!user.agentContext?.strategistOutput) {
    throw new Error(
      "Brand voice not set — run onboarding analysis before generating content",
    );
  }

  const recentPosts = await db.contentPost.findMany({
    where: { userId },
    orderBy: { publishedAt: "desc" },
    take: 10,
    select: { draft: { select: { content: true } } },
  });

  const recentCaptions = recentPosts
    .map((p) => {
      const c = p.draft.content as { caption?: string } | null;
      return c?.caption ?? "";
    })
    .filter(Boolean);

  const result = await runEcho({
    businessDescription: user.businessDescription ?? "",
    brandVoice: user.agentContext.strategistOutput,
    recentCaptions,
    hint,
  });

  const draft = await db.contentDraft.create({
    data: {
      userId,
      platform: Platform.INSTAGRAM,
      status: DraftStatus.AWAITING_REVIEW,
      content: {
        caption: result.caption,
        hashtags: result.hashtags,
        pillar: result.pillar,
      } as Prisma.InputJsonValue,
      voiceMatchScore: result.voiceMatchConfidence,
    },
  });

  await db.agentEvent.create({
    data: {
      userId,
      agent: Agent.ECHO,
      eventType: "draft_created",
      payload: {
        draftId: draft.id,
        pillar: result.pillar,
        voiceMatchConfidence: result.voiceMatchConfidence,
      },
    },
  });

  return draft.id;
}
