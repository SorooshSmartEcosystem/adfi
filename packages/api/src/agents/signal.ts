import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  db,
  Agent,
  Direction,
  FindingSeverity,
  MessageChannel,
  PhoneNumberStatus,
  type Prisma,
} from "@orb/db";
import {
  anthropic,
  jsonSchemaForAnthropic,
  MODELS,
  recordAnthropicUsage,
} from "../services/anthropic";
import { sendSms } from "../services/twilio";
import { SIGNAL_SYSTEM_PROMPT } from "./prompts/signal";

const SignalOutputSchema = z.object({
  intent: z.enum([
    "booking",
    "commission_inquiry",
    "complaint",
    "general",
    "spam",
  ]),
  response: z.string().min(1).max(320),
  needsHandoff: z.boolean(),
  suggestedAction: z
    .object({
      type: z.enum(["create_appointment", "flag_for_review", "none"]),
      data: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
});

export type SignalOutput = z.infer<typeof SignalOutputSchema>;

type ThreadMessage = {
  direction: Direction;
  body: string;
};

export async function runSignal(args: {
  brandVoice: unknown;
  businessDescription: string;
  threadHistory: ThreadMessage[];
  inboundMessage: string;
  userId?: string;
}): Promise<SignalOutput> {
  const historyText = args.threadHistory
    .map(
      (m) => `${m.direction === Direction.INBOUND ? "Customer" : "ADFI"}: ${m.body}`,
    )
    .join("\n");

  const userMessage = `Business description:
${args.businessDescription || "(not set)"}

Brand voice fingerprint:
${JSON.stringify(args.brandVoice ?? {}, null, 2)}

Conversation so far:
${historyText || "(this is the first message)"}

New message from customer:
${args.inboundMessage}`;

  const response = await anthropic().messages.create({
    model: MODELS.SONNET,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: SIGNAL_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
    output_config: {
      format: {
        type: "json_schema",
        schema: jsonSchemaForAnthropic(SignalOutputSchema),
      },
    },
  });

  if (args.userId) {
    void recordAnthropicUsage({
      userId: args.userId,
      agent: Agent.SIGNAL,
      eventType: "signal_run",
      response,
    });
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error(
      `Signal returned no text content (stop_reason: ${response.stop_reason})`,
    );
  }

  const raw = JSON.parse(textBlock.text);
  return SignalOutputSchema.parse(raw);
}

// Full inbound-SMS orchestration. Called by the Twilio webhook after it has
// verified the signature. Safe to call multiple times for the same message
// (Twilio retries on non-2xx): threadId is keyed on (userId, fromAddress), so
// dedup logic downstream can rely on the combo.
export async function processInboundSms(args: {
  from: string;
  to: string;
  body: string;
}): Promise<{ handled: boolean; reason?: string }> {
  const phoneRecord = await db.phoneNumber.findFirst({
    where: { number: args.to, status: PhoneNumberStatus.ACTIVE },
    include: {
      user: { include: { agentContext: true } },
    },
  });

  if (!phoneRecord) {
    return { handled: false, reason: "unknown_destination" };
  }

  const user = phoneRecord.user;

  // Reuse or create a thread for (user, from) pairs.
  const existingThread = await db.message.findFirst({
    where: {
      userId: user.id,
      fromAddress: args.from,
      channel: MessageChannel.SMS,
    },
    orderBy: { createdAt: "desc" },
    select: { threadId: true, handledBy: true },
  });

  const threadId = existingThread?.threadId ?? randomUUID();

  await db.message.create({
    data: {
      userId: user.id,
      threadId,
      channel: MessageChannel.SMS,
      fromAddress: args.from,
      direction: Direction.INBOUND,
      body: args.body,
    },
  });

  // Thread is human-handled; Signal stays out.
  if (existingThread?.handledBy === "user") {
    return { handled: false, reason: "user_handled" };
  }

  const history = await db.message.findMany({
    where: { userId: user.id, threadId },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: { direction: true, body: true },
  });

  const result = await runSignal({
    brandVoice: user.agentContext?.strategistOutput ?? {},
    businessDescription: user.businessDescription ?? "",
    threadHistory: history,
    inboundMessage: args.body,
    userId: user.id,
  });

  await db.message.create({
    data: {
      userId: user.id,
      threadId,
      channel: MessageChannel.SMS,
      fromAddress: args.from,
      direction: Direction.OUTBOUND,
      body: result.response,
      handledBy: "signal",
      metadata: {
        intent: result.intent,
        needsHandoff: result.needsHandoff,
        suggestedAction: result.suggestedAction
          ? (result.suggestedAction as Prisma.InputJsonValue)
          : null,
      } as Prisma.InputJsonValue,
    },
  });

  await sendSms({
    from: args.to,
    to: args.from,
    body: result.response,
  });

  await db.agentEvent.create({
    data: {
      userId: user.id,
      agent: Agent.SIGNAL,
      eventType: "sms_handled",
      payload: {
        threadId,
        intent: result.intent,
        inboundLength: args.body.length,
        responseLength: result.response.length,
        needsHandoff: result.needsHandoff,
      },
    },
  });

  if (result.needsHandoff) {
    await db.finding.create({
      data: {
        userId: user.id,
        agent: Agent.SIGNAL,
        severity: FindingSeverity.NEEDS_ATTENTION,
        summary: `${args.from} needs your attention`,
        payload: {
          threadId,
          intent: result.intent,
          lastMessage: args.body,
        },
      },
    });
  }

  return { handled: true };
}

// Inbound Messenger / Instagram DM. Same shape as processInboundSms — find
// the user via the page id (entry.id from the meta webhook payload), persist
// the inbound message, and let Signal generate a reply unless the thread
// has been taken over by the user.
export async function processInboundMessenger(args: {
  pageId: string; // meta entry.id — matches ConnectedAccount.externalId
  senderPsid: string; // page-scoped sender id
  body: string;
  channel: "MESSENGER" | "INSTAGRAM_DM";
}): Promise<{ handled: boolean; reason?: string; reply?: string }> {
  const account = await db.connectedAccount.findFirst({
    where: { externalId: args.pageId, disconnectedAt: null },
    include: {
      user: { include: { agentContext: true } },
    },
  });
  if (!account) {
    return { handled: false, reason: "unknown_page" };
  }
  const user = account.user;

  const channel =
    args.channel === "INSTAGRAM_DM"
      ? MessageChannel.INSTAGRAM_DM
      : MessageChannel.MESSENGER;

  const existingThread = await db.message.findFirst({
    where: {
      userId: user.id,
      fromAddress: args.senderPsid,
      channel,
    },
    orderBy: { createdAt: "desc" },
    select: { threadId: true, handledBy: true },
  });

  const threadId = existingThread?.threadId ?? randomUUID();

  await db.message.create({
    data: {
      userId: user.id,
      threadId,
      channel,
      fromAddress: args.senderPsid,
      direction: Direction.INBOUND,
      body: args.body,
    },
  });

  if (existingThread?.handledBy === "user") {
    return { handled: false, reason: "user_handled" };
  }

  const history = await db.message.findMany({
    where: { userId: user.id, threadId },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: { direction: true, body: true },
  });

  const result = await runSignal({
    brandVoice: user.agentContext?.strategistOutput ?? {},
    businessDescription: user.businessDescription ?? "",
    threadHistory: history,
    inboundMessage: args.body,
    userId: user.id,
  });

  await db.message.create({
    data: {
      userId: user.id,
      threadId,
      channel,
      fromAddress: args.senderPsid,
      direction: Direction.OUTBOUND,
      body: result.response,
      handledBy: "signal",
      metadata: {
        intent: result.intent,
        needsHandoff: result.needsHandoff,
        suggestedAction: result.suggestedAction
          ? (result.suggestedAction as Prisma.InputJsonValue)
          : null,
      } as Prisma.InputJsonValue,
    },
  });

  await db.agentEvent.create({
    data: {
      userId: user.id,
      agent: Agent.SIGNAL,
      eventType: "messenger_handled",
      payload: {
        threadId,
        channel: args.channel,
        intent: result.intent,
        inboundLength: args.body.length,
        responseLength: result.response.length,
        needsHandoff: result.needsHandoff,
      },
    },
  });

  if (result.needsHandoff) {
    await db.finding.create({
      data: {
        userId: user.id,
        agent: Agent.SIGNAL,
        severity: FindingSeverity.NEEDS_ATTENTION,
        summary: `${args.senderPsid} needs your attention`,
        payload: {
          threadId,
          intent: result.intent,
          lastMessage: args.body,
        },
      },
    });
  }

  // Caller (the webhook route) is responsible for actually delivering the
  // reply to Meta — we hand the text back so the route can use the page
  // access token it already loaded.
  return { handled: true, reply: result.response };
}
