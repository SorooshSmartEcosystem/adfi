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
import { getMessengerProfile } from "../services/meta";
import { getUserAvatarUrl as getTelegramAvatarUrl } from "../services/telegram";
import { decryptToken } from "../services/crypto";
import {
  guardInbound,
  guardInboundCall,
  effectivePlan,
} from "../services/abuse-guard";
import { SIGNAL_SYSTEM_PROMPT } from "./prompts/signal";
import { detectLanguage } from "./language";

// Anthropic's structured-output mode rejects `additionalProperties: <schema>`
// (which is what z.record() compiles to) — it only accepts
// `additionalProperties: false`. So we describe the suggested action as a
// fixed shape with optional concrete fields the agent might fill in,
// rather than an open-ended record.
const SignalOutputSchema = z.object({
  intent: z.enum([
    "booking",
    "commission_inquiry",
    "complaint",
    "general",
    "spam",
  ]),
  // 1000 covers Messenger/IG/Telegram comfortably (Telegram caps at 4096
  // but messages that long don't read like a person; SMS is enforced
  // separately at send time by twilio's 1600-char hard cap).
  response: z.string().min(1).max(1000),
  needsHandoff: z.boolean(),
  suggestedAction: z
    .object({
      type: z.enum(["create_appointment", "flag_for_review", "none"]),
      // Concrete optional fields — covers the v1 use cases without relying
      // on a free-form record. Add fields here as new action types appear.
      summary: z.string().optional(),
      proposedTime: z.string().optional(),
      durationMinutes: z.number().optional(),
      flagReason: z.string().optional(),
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
  businessName?: string | null;
  businessDescription: string;
  faqText?: string | null;
  threadHistory: ThreadMessage[];
  inboundMessage: string;
  userId?: string;
}): Promise<SignalOutput> {
  // Outbound messages are labeled "You" in the conversation history we
  // hand the model — earlier "ADFI" leaked into customer-facing replies
  // when the model parroted that label back as the platform name. The
  // model is the business owner; "you" is the right pronoun.
  const historyText = args.threadHistory
    .map(
      (m) => `${m.direction === Direction.INBOUND ? "Customer" : "You"}: ${m.body}`,
    )
    .join("\n");

  // Match the customer's language. Detect from the most-recent
  // inbound message + the conversation history (so a customer who
  // started in Farsi but sent a one-word "ok" in English doesn't
  // suddenly trigger an English reply). The directive is forceful
  // because Sonnet — even more than Opus — will fall back to the
  // brand-voice's language when conversation is short.
  const langSource = `${args.inboundMessage}\n${historyText}`;
  const lang = detectLanguage(langSource);
  const langDirective =
    lang.code === "en"
      ? "\n\nReply in English."
      : `\n\n=== LANGUAGE LOCK ===\nThe customer wrote to you in ${lang.label}. Reply in ${lang.label}. Do not switch languages mid-reply. Do not write a single word in English (proper nouns the customer used are fine to repeat). The brand voice fingerprint above may be in a different language — that's the brand's preference, but the customer's language wins for this reply. Match the customer's tone and writing style in ${lang.label}.`;

  // Knowledge base — free-form FAQ text the business pasted in settings.
  // Injected as a clearly-labeled section so the model treats it as
  // ground truth for hours/pricing/services/policies. When empty,
  // Signal falls back to brand voice + description (current behavior).
  const faqBlock = args.faqText?.trim()
    ? `\n\nKnowledge base (treat as authoritative — quote directly when relevant; do NOT invent details outside this and the business description):\n${args.faqText.trim()}`
    : "";

  const userMessage = `Business name (use this when a customer asks what platform / product / service / app this is):
${args.businessName?.trim() || "(not set — ask the customer to hold rather than inventing)"}

Business description:
${args.businessDescription || "(not set)"}

Brand voice fingerprint:
${JSON.stringify(args.brandVoice ?? {}, null, 2)}${faqBlock}

Conversation so far:
${historyText || "(this is the first message)"}

New message from customer:
${args.inboundMessage}${langDirective}`;

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
      user: { include: { agentContexts: true } },
      business: true,
    },
  });

  if (!phoneRecord) {
    return { handled: false, reason: "unknown_destination" };
  }

  const user = phoneRecord.user;
  // Frozen-account gate. Admin can suspend a user via
  // admin.suspendUser (sets deletedAt) — we bail here so an inbound
  // SMS to a suspended account doesn't trigger Signal's LLM reply.
  if (user.deletedAt) {
    return { handled: false, reason: "user_frozen" };
  }
  // Per-business freeze for the phone number's tagged business.
  if (phoneRecord.business?.deletedAt) {
    return { handled: false, reason: "business_frozen" };
  }
  // Active business for this inbound: the phone number's tagged
  // businessId (set when the user provisions the line under a business)
  // takes precedence; fall back to whatever business the user has
  // active right now. Every Message + Contact + Call we write below
  // gets stamped with this id so the inbox view of the right business
  // surfaces them.
  const businessId =
    phoneRecord.businessId ?? user.currentBusinessId ?? null;

  // Abuse guard — see processInboundTelegram comment.
  const smsPlan = await effectivePlan(user.id);
  const smsGuard = await guardInbound({
    userId: user.id,
    channel: MessageChannel.SMS,
    fromAddress: args.from,
    body: args.body,
    plan: smsPlan,
  });
  if (!smsGuard.allow) {
    if (smsGuard.reason === "trivial_body" || smsGuard.reason === "duplicate") {
      return { handled: false, reason: smsGuard.reason };
    }
    const existingT = await db.message.findFirst({
      where: {
        userId: user.id,
        fromAddress: args.from,
        channel: MessageChannel.SMS,
      },
      orderBy: { createdAt: "desc" },
      select: { threadId: true },
    });
    const tid = existingT?.threadId ?? randomUUID();
    await db.message.create({
      data: {
        userId: user.id,
        businessId,
        threadId: tid,
        channel: MessageChannel.SMS,
        fromAddress: args.from,
        direction: Direction.INBOUND,
        body: args.body,
      },
    });
    return { handled: false, reason: smsGuard.reason };
  }

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
      businessId,
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
    brandVoice: user.agentContexts?.[0]?.strategistOutput ?? {},
    businessName: phoneRecord.business?.name ?? user.businessName,
    businessDescription: user.businessDescription ?? "",
    faqText: user.agentContexts?.[0]?.faqText ?? null,
    threadHistory: history,
    inboundMessage: args.body,
    userId: user.id,
  });

  await db.message.create({
    data: {
      userId: user.id,
      businessId,
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

// Inbound voice call — Twilio's voice webhook hits this synchronously and
// expects TwiML back in <100ms. We do the cheap lookups + frozen gates here,
// hand back a "decision" object, and the webhook route turns that into TwiML.
//
// We deliberately do NOT create the Call row yet — durationSeconds isn't
// known until the call ends, and creating a half-populated row before the
// WS relay has confirmed the call started would leave orphans on dropped
// calls. The relay (apps/voice-relay) writes the Call row when the
// conversation actually begins.
export type CallDecision =
  | {
      allow: true;
      userId: string;
      businessId: string | null;
      phoneNumberId: string;
      faqText: string | null;
      brandVoice: unknown;
      businessName: string | null;
      businessDescription: string;
      usedMinutes: number;
      capMinutes: number;
    }
  | {
      allow: false;
      reason:
        | "unknown_destination"
        | "user_frozen"
        | "business_frozen"
        | "no_brand_voice"
        | "monthly_voice_cap";
      usedMinutes?: number;
      capMinutes?: number;
    };

export async function prepareInboundCall(args: {
  to: string; // dialed number (our Twilio line)
}): Promise<CallDecision> {
  const phoneRecord = await db.phoneNumber.findFirst({
    where: { number: args.to, status: PhoneNumberStatus.ACTIVE },
    include: {
      user: { include: { agentContexts: true } },
      business: true,
    },
  });

  if (!phoneRecord) return { allow: false, reason: "unknown_destination" };

  const user = phoneRecord.user;
  if (user.deletedAt) return { allow: false, reason: "user_frozen" };
  if (phoneRecord.business?.deletedAt) {
    return { allow: false, reason: "business_frozen" };
  }

  const ac = user.agentContexts?.[0];
  // Without a brand voice Signal can't sound like the business — better to
  // fail loud than have it answer in a generic voice that breaks the rule
  // "Signal speaks AS the connected business."
  if (!ac?.strategistOutput) {
    return { allow: false, reason: "no_brand_voice" };
  }

  // Monthly voice-minute cap. Voice has a real per-minute cost so we
  // meter it harder than text — over cap drops to a voicemail flow
  // (~$0.02/call) instead of a live conversation (~$0.06/min).
  const plan = await effectivePlan(user.id);
  const voiceGuard = await guardInboundCall({ userId: user.id, plan });
  if (!voiceGuard.allow) {
    return {
      allow: false,
      reason: "monthly_voice_cap",
      usedMinutes: voiceGuard.usedMinutes,
      capMinutes: voiceGuard.capMinutes,
    };
  }

  return {
    allow: true,
    userId: user.id,
    businessId: phoneRecord.businessId ?? user.currentBusinessId ?? null,
    phoneNumberId: phoneRecord.id,
    faqText: ac.faqText ?? null,
    brandVoice: ac.strategistOutput,
    businessName: phoneRecord.business?.name ?? user.businessName ?? null,
    businessDescription: user.businessDescription ?? "",
    usedMinutes: voiceGuard.usedMinutes,
    capMinutes: voiceGuard.capMinutes,
  };
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
      user: { include: { agentContexts: true } },
      business: true,
    },
  });
  if (!account) {
    return { handled: false, reason: "unknown_page" };
  }
  const user = account.user;
  // Frozen-account gate (matches processInboundTelegram). Admin can
  // suspend a user via admin.suspendUser; we bail before Signal's
  // LLM call so frozen accounts don't burn tokens.
  if (user.deletedAt) {
    return { handled: false, reason: "user_frozen" };
  }
  // Per-business freeze — same gate at the business level.
  if (account.business?.deletedAt) {
    return { handled: false, reason: "business_frozen" };
  }
  // Active business for this inbound. Prefer the ConnectedAccount's
  // businessId (set when the user connected the page) — that's the
  // ground truth for "which business owns this inbox." Fall back to
  // the user's current business for accounts connected before the
  // multi-business migration.
  const businessId = account.businessId ?? user.currentBusinessId ?? null;

  const channel =
    args.channel === "INSTAGRAM_DM"
      ? MessageChannel.INSTAGRAM_DM
      : MessageChannel.MESSENGER;

  // Cache the sender's display name + avatar (best-effort). Skip the meta
  // lookup if we already have a fresh profile for this contact (24h TTL).
  void (async () => {
    try {
      const existing = await db.contact.findUnique({
        where: {
          userId_channel_externalId: {
            userId: user.id,
            channel,
            externalId: args.senderPsid,
          },
        },
      });
      const stale =
        !existing ||
        !existing.displayName ||
        !existing.avatarUrl ||
        Date.now() - existing.updatedAt.getTime() > 24 * 60 * 60 * 1000;
      if (!stale) {
        await db.contact.update({
          where: { id: existing!.id },
          data: { lastSeenAt: new Date() },
        });
        return;
      }
      const token = (() => {
        try {
          return decryptToken(account.encryptedToken);
        } catch {
          return null;
        }
      })();
      if (!token) return;
      const profile = await getMessengerProfile({
        userId: args.senderPsid,
        pageAccessToken: token,
        channel: args.channel,
      });
      await db.contact.upsert({
        where: {
          userId_channel_externalId: {
            userId: user.id,
            channel,
            externalId: args.senderPsid,
          },
        },
        create: {
          userId: user.id,
          businessId,
          channel,
          externalId: args.senderPsid,
          displayName: profile?.name ?? null,
          avatarUrl: profile?.avatarUrl ?? null,
        },
        update: {
          displayName: profile?.name ?? existing?.displayName ?? null,
          avatarUrl: profile?.avatarUrl ?? existing?.avatarUrl ?? null,
          lastSeenAt: new Date(),
        },
      });
    } catch (err) {
      console.warn("contact upsert failed:", err);
    }
  })();

  // Abuse guard — see processInboundTelegram for the rationale; same shape.
  const messengerPlan = await effectivePlan(user.id);
  const messengerGuard = await guardInbound({
    userId: user.id,
    channel,
    fromAddress: args.senderPsid,
    body: args.body,
    plan: messengerPlan,
  });
  if (!messengerGuard.allow) {
    if (
      messengerGuard.reason === "trivial_body" ||
      messengerGuard.reason === "duplicate"
    ) {
      return { handled: false, reason: messengerGuard.reason };
    }
    const existingT = await db.message.findFirst({
      where: { userId: user.id, fromAddress: args.senderPsid, channel },
      orderBy: { createdAt: "desc" },
      select: { threadId: true },
    });
    const tid = existingT?.threadId ?? randomUUID();
    await db.message.create({
      data: {
        userId: user.id,
        businessId,
        threadId: tid,
        channel,
        fromAddress: args.senderPsid,
        direction: Direction.INBOUND,
        body: args.body,
      },
    });
    if (messengerGuard.reason === "daily_signal_cap") {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const alreadyWarned = await db.finding.findFirst({
        where: {
          userId: user.id,
          agent: Agent.SIGNAL,
          summary: { contains: "daily signal budget" },
          createdAt: { gte: dayAgo },
          acknowledged: false,
        },
        select: { id: true },
      });
      if (!alreadyWarned) {
        await db.finding.create({
          data: {
            userId: user.id,
            agent: Agent.SIGNAL,
            severity: FindingSeverity.NEEDS_ATTENTION,
            summary: `you hit your daily signal budget (${messengerPlan.toLowerCase()}) — replies paused for 24h`,
            payload: {
              channel: args.channel,
              detail: messengerGuard.detail ?? null,
            },
          },
        });
      }
    }
    return { handled: false, reason: messengerGuard.reason };
  }

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
      businessId,
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
    brandVoice: user.agentContexts?.[0]?.strategistOutput ?? {},
    businessName: account.business?.name ?? user.businessName,
    businessDescription: user.businessDescription ?? "",
    faqText: user.agentContexts?.[0]?.faqText ?? null,
    threadHistory: history,
    inboundMessage: args.body,
    userId: user.id,
  });

  await db.message.create({
    data: {
      userId: user.id,
      businessId,
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

// Inbound Telegram message — bot got a private DM. Look up the user via the
// bot identity (ConnectedAccount.externalId = bot id), persist + reply via
// Signal unless the thread was taken over.
//
// Channel posts are emitted by Telegram with the bot as a member of a
// channel; we don't process those here — the bot is read-only on channels
// for now and only used as a publisher.
export async function processInboundTelegram(args: {
  botId: string; // ConnectedAccount.externalId for the TELEGRAM provider
  fromId: string; // Telegram user id sending the DM
  fromName: string | null;
  body: string;
}): Promise<{ handled: boolean; reason?: string; reply?: string }> {
  const account = await db.connectedAccount.findFirst({
    where: {
      provider: "TELEGRAM",
      externalId: args.botId,
      disconnectedAt: null,
    },
    include: {
      user: { include: { agentContexts: true } },
      business: true,
    },
  });
  if (!account) {
    return { handled: false, reason: "unknown_bot" };
  }
  const user = account.user;
  // Frozen-account gate. Admin can suspend a user via
  // admin.suspendUser (sets deletedAt). Crons already skip deletedAt
  // users; we mirror that here so test-account webhooks don't keep
  // burning Anthropic tokens via Signal replies.
  if (user.deletedAt) {
    return { handled: false, reason: "user_frozen" };
  }
  // Per-business freeze. STUDIO/AGENCY accounts can have one brand
  // frozen while the rest stay active — this Telegram inbound is
  // tagged to account.business, so we bail when that specific
  // business is frozen.
  if (account.business?.deletedAt) {
    return { handled: false, reason: "business_frozen" };
  }
  // Same active-business resolution as processInboundMessenger — the
  // bot's ConnectedAccount.businessId tells us which business owns this
  // inbox; fall back to user's current business for legacy connections.
  const businessId = account.businessId ?? user.currentBusinessId ?? null;
  const channel = MessageChannel.TELEGRAM;

  void (async () => {
    try {
      const existing = await db.contact.findUnique({
        where: {
          userId_channel_externalId: {
            userId: user.id,
            channel,
            externalId: args.fromId,
          },
        },
      });
      const avatarStale =
        !existing?.avatarUrl ||
        Date.now() - existing.updatedAt.getTime() > 24 * 60 * 60 * 1000;

      let avatarUrl: string | null = existing?.avatarUrl ?? null;
      if (avatarStale) {
        const token = (() => {
          try {
            return decryptToken(account.encryptedToken);
          } catch {
            return null;
          }
        })();
        if (token) {
          const fetched = await getTelegramAvatarUrl({
            token,
            userId: args.fromId,
          });
          if (fetched) avatarUrl = fetched;
        }
      }

      await db.contact.upsert({
        where: {
          userId_channel_externalId: {
            userId: user.id,
            channel,
            externalId: args.fromId,
          },
        },
        create: {
          userId: user.id,
          businessId,
          channel,
          externalId: args.fromId,
          displayName: args.fromName,
          avatarUrl,
        },
        update: {
          displayName: args.fromName ?? existing?.displayName ?? undefined,
          avatarUrl,
          lastSeenAt: new Date(),
        },
      });
    } catch (err) {
      console.warn("telegram contact upsert failed:", err);
    }
  })();

  // Abuse guard — drop spam, dedup retries, enforce per-sender + per-account
  // budgets. Runs before persisting so trivial / duplicate messages don't
  // even create rows in the message table.
  const plan = await effectivePlan(user.id);
  const guard = await guardInbound({
    userId: user.id,
    channel,
    fromAddress: args.fromId,
    body: args.body,
    plan,
  });

  if (!guard.allow) {
    if (guard.reason === "trivial_body" || guard.reason === "duplicate") {
      // Pure noise — don't persist, don't reply, return 200 so Telegram
      // doesn't keep retrying.
      return { handled: false, reason: guard.reason };
    }
    // Rate-limited or daily-cap: still persist the message so the user
    // can see what came in via /inbox, just skip the LLM call.
    const existingThread = await db.message.findFirst({
      where: { userId: user.id, fromAddress: args.fromId, channel },
      orderBy: { createdAt: "desc" },
      select: { threadId: true },
    });
    const threadId = existingThread?.threadId ?? randomUUID();
    await db.message.create({
      data: {
        userId: user.id,
        businessId,
        threadId,
        channel,
        fromAddress: args.fromId,
        direction: Direction.INBOUND,
        body: args.body,
      },
    });
    if (guard.reason === "daily_signal_cap") {
      // Surface the cap once a day so the user can decide to upgrade. Dedup
      // by checking for an unacknowledged finding today.
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const alreadyWarned = await db.finding.findFirst({
        where: {
          userId: user.id,
          agent: Agent.SIGNAL,
          summary: { contains: "daily signal budget" },
          createdAt: { gte: dayAgo },
          acknowledged: false,
        },
        select: { id: true },
      });
      if (!alreadyWarned) {
        await db.finding.create({
          data: {
            userId: user.id,
            agent: Agent.SIGNAL,
            severity: FindingSeverity.NEEDS_ATTENTION,
            summary: `you hit your daily signal budget (${plan.toLowerCase()}) — replies paused for 24h`,
            payload: {
              channel: "TELEGRAM",
              detail: guard.detail ?? null,
            },
          },
        });
      }
    }
    return { handled: false, reason: guard.reason };
  }

  const existingThread = await db.message.findFirst({
    where: { userId: user.id, fromAddress: args.fromId, channel },
    orderBy: { createdAt: "desc" },
    select: { threadId: true, handledBy: true },
  });
  const threadId = existingThread?.threadId ?? randomUUID();

  await db.message.create({
    data: {
      userId: user.id,
      businessId,
      threadId,
      channel,
      fromAddress: args.fromId,
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

  // If the user hasn't completed onboarding (no strategistOutput) signal
  // can't reply in their voice — surface this as a Finding rather than
  // silently failing.
  if (!user.agentContexts?.[0]?.strategistOutput) {
    await db.finding.create({
      data: {
        userId: user.id,
        agent: Agent.SIGNAL,
        severity: FindingSeverity.NEEDS_ATTENTION,
        summary: `telegram dm from ${args.fromName ?? args.fromId} — finish onboarding so i can reply`,
        payload: {
          threadId,
          channel: "TELEGRAM",
          lastMessage: args.body,
        },
      },
    });
    return { handled: false, reason: "no_brand_voice" };
  }

  let result: SignalOutput;
  try {
    result = await runSignal({
      brandVoice: user.agentContexts?.[0]?.strategistOutput,
      businessName: account.business?.name ?? user.businessName,
      businessDescription: user.businessDescription ?? "",
      faqText: user.agentContexts?.[0]?.faqText ?? null,
      threadHistory: history,
      inboundMessage: args.body,
      userId: user.id,
    });
  } catch (err) {
    console.error("processInboundTelegram: runSignal threw:", err);
    await db.finding.create({
      data: {
        userId: user.id,
        agent: Agent.SIGNAL,
        severity: FindingSeverity.NEEDS_ATTENTION,
        summary: `telegram dm from ${args.fromName ?? args.fromId} — i couldn't draft a reply, take over from /inbox`,
        payload: {
          threadId,
          channel: "TELEGRAM",
          lastMessage: args.body,
          error: err instanceof Error ? err.message : String(err),
        },
      },
    });
    return { handled: false, reason: "signal_failed" };
  }

  await db.message.create({
    data: {
      userId: user.id,
      businessId,
      threadId,
      channel,
      fromAddress: args.fromId,
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
      eventType: "telegram_handled",
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
        summary: `${args.fromName ?? args.fromId} on telegram needs your attention`,
        payload: {
          threadId,
          intent: result.intent,
          lastMessage: args.body,
        },
      },
    });
  }

  return { handled: true, reply: result.response };
}
