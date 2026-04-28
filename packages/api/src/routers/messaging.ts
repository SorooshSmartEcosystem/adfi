import { z } from "zod";
import { Direction, MessageChannel, Provider } from "@orb/db";
import { router, authedProc } from "../trpc";
import { OrbError } from "../errors";
import { sendSms } from "../services/twilio";
import { sendMessengerReply } from "../services/meta";
import { sendMessage as sendTelegramMessage } from "../services/telegram";
import { decryptToken } from "../services/crypto";
import { notifyAdminOfError } from "../services/admin-notify";

export type InboxItem =
  | {
      kind: "thread";
      id: string;
      channel: "SMS" | "INSTAGRAM_DM" | "MESSENGER" | "EMAIL" | "TELEGRAM";
      fromAddress: string;
      displayName: string | null;
      avatarUrl: string | null;
      preview: string;
      at: Date;
      handled: boolean;
    }
  | {
      kind: "call";
      id: string;
      channel: "CALL";
      fromAddress: string;
      displayName: string | null;
      avatarUrl: string | null;
      preview: string;
      at: Date;
      handled: boolean;
      booked: boolean;
    };

export const messagingRouter = router({
  // Unified inbox: messages (grouped by thread) + calls, newest first.
  inboxFeed: authedProc
    .input(
      z.object({
        filter: z
          .enum(["all", "calls", "texts", "dms", "telegram"])
          .default("all"),
        limit: z.number().min(1).max(50).default(30),
      }),
    )
    .query(async ({ ctx, input }): Promise<InboxItem[]> => {
      // Look back 30 days. Older threads can be paged in later if we need
      // them; for the inbox preview list this slashes the row count by ~10x.
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [msgs, calls, appts, contacts] = await Promise.all([
        input.filter === "calls"
          ? Promise.resolve(
              [] as Array<{
                threadId: string;
                channel: MessageChannel;
                fromAddress: string;
                body: string;
                createdAt: Date;
                handledBy: string | null;
              }>,
            )
          : ctx.db.message.findMany({
              where: {
                OR: [
                  { businessId: ctx.currentBusinessId, createdAt: { gte: since } },
                  { businessId: null, userId: ctx.user.id, createdAt: { gte: since } },
                ],
              },
              orderBy: { createdAt: "desc" },
              take: 250,
              // Drop the metadata JSON column + id from the wire — the
              // inbox only renders the preview line per thread.
              select: {
                threadId: true,
                channel: true,
                fromAddress: true,
                body: true,
                createdAt: true,
                handledBy: true,
              },
            }),
        input.filter === "texts" || input.filter === "dms"
          ? Promise.resolve([])
          : ctx.db.call.findMany({
              where: {
                OR: [
                  { businessId: ctx.currentBusinessId },
                  { businessId: null, userId: ctx.user.id },
                ],
              },
              orderBy: { startedAt: "desc" },
              take: input.limit,
            }),
        ctx.db.appointment.findMany({
          where: {
            OR: [
              { businessId: ctx.currentBusinessId, callId: { not: null } },
              { businessId: null, userId: ctx.user.id, callId: { not: null } },
            ],
          },
          select: { callId: true },
        }),
        ctx.db.contact.findMany({
          where: {
            OR: [
              { businessId: ctx.currentBusinessId },
              { businessId: null, userId: ctx.user.id },
            ],
          },
          select: {
            channel: true,
            externalId: true,
            displayName: true,
            avatarUrl: true,
          },
        }),
      ]);

      const bookedCallIds = new Set(appts.map((a) => a.callId).filter(Boolean));
      const contactKey = (channel: string, externalId: string) =>
        `${channel}:${externalId}`;
      const contactMap = new Map(
        contacts.map((c) => [
          contactKey(c.channel, c.externalId),
          { displayName: c.displayName, avatarUrl: c.avatarUrl },
        ]),
      );

      const threadMap = new Map<string, (typeof msgs)[number]>();
      for (const m of msgs) {
        const current = threadMap.get(m.threadId);
        if (!current) threadMap.set(m.threadId, m);
      }

      const threadItems: InboxItem[] = Array.from(threadMap.values())
        .filter((m) => {
          if (input.filter === "texts") return m.channel === "SMS";
          if (input.filter === "dms") {
            // "dms" is the user-facing umbrella for messaging-app DMs.
            // Includes IG / Messenger / Telegram so flipping to it doesn't
            // silently exclude an entire channel the user expects to see.
            return (
              m.channel === "INSTAGRAM_DM" ||
              m.channel === "MESSENGER" ||
              m.channel === "TELEGRAM"
            );
          }
          if (input.filter === "telegram") return m.channel === "TELEGRAM";
          return true;
        })
        .map((m) => {
          const c = contactMap.get(contactKey(m.channel, m.fromAddress));
          return {
            kind: "thread" as const,
            id: m.threadId,
            channel: m.channel,
            fromAddress: m.fromAddress,
            displayName: c?.displayName ?? null,
            avatarUrl: c?.avatarUrl ?? null,
            preview: m.body.slice(0, 160),
            at: m.createdAt,
            handled: Boolean(m.handledBy),
          };
        });

      const callItems: InboxItem[] = calls.map((c) => {
        const intent = (c.extractedIntent ?? {}) as { summary?: string };
        const contact = contactMap.get(contactKey("SMS", c.fromNumber));
        return {
          kind: "call" as const,
          id: c.id,
          channel: "CALL" as const,
          fromAddress: c.fromNumber,
          displayName: contact?.displayName ?? null,
          avatarUrl: contact?.avatarUrl ?? null,
          preview: intent.summary ?? "caller left no details",
          at: c.startedAt,
          handled:
            c.recoveredStatus === "ANSWERED_BY_SIGNAL" ||
            c.recoveredStatus === "ANSWERED_BY_USER" ||
            c.recoveredStatus === "MISSED_AND_RECOVERED",
          booked: bookedCallIds.has(c.id),
        };
      });

      return [...threadItems, ...callItems]
        .sort((a, b) => b.at.getTime() - a.at.getTime())
        .slice(0, input.limit);
    }),

  // Returns the most recent message per thread (thread preview list).
  // For v1 volumes this fetches recent messages and groups in JS; swap to
  // Postgres DISTINCT ON with a raw query when inbox volumes outgrow this.
  listThreads: authedProc
    .input(
      z.object({
        channel: z.nativeEnum(MessageChannel).optional(),
        limit: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const recent = await ctx.db.message.findMany({
        where: {
          OR: [
            { businessId: ctx.currentBusinessId,
              ...(input.channel && { channel: input.channel }) },
            { businessId: null, userId: ctx.user.id,
              ...(input.channel && { channel: input.channel }) },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      });

      const threadMap = new Map<string, (typeof recent)[number]>();
      for (const msg of recent) {
        if (!threadMap.has(msg.threadId)) threadMap.set(msg.threadId, msg);
      }
      return Array.from(threadMap.values()).slice(0, input.limit);
    }),

  getThread: authedProc
    .input(z.object({ threadId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const messages = await ctx.db.message.findMany({
        where: {
          OR: [
            { businessId: ctx.currentBusinessId, threadId: input.threadId },
            { businessId: null, userId: ctx.user.id, threadId: input.threadId },
          ],
        },
        orderBy: { createdAt: "asc" },
      });
      if (messages.length === 0) throw OrbError.NOT_FOUND("thread");
      const first = messages[0]!;
      const contact = await ctx.db.contact.findUnique({
        where: {
          userId_channel_externalId: {
            userId: ctx.user.id,
            channel: first.channel,
            externalId: first.fromAddress,
          },
        },
        select: { displayName: true, avatarUrl: true },
      });
      return {
        messages,
        contact: {
          displayName: contact?.displayName ?? null,
          avatarUrl: contact?.avatarUrl ?? null,
        },
      };
    }),

  // Writes an outbound message to the DB. Actual delivery via Twilio/Meta
  // is deferred until the service wrappers land.
  sendReply: authedProc
    .input(
      z.object({
        threadId: z.string().uuid(),
        body: z.string().min(1).max(4000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const last = await ctx.db.message.findFirst({
        where: { userId: ctx.user.id, threadId: input.threadId },
        orderBy: { createdAt: "desc" },
      });
      if (!last) throw OrbError.NOT_FOUND("thread");

      // Deliver to the right provider before we persist the outbound row,
      // so a delivery failure surfaces as an error to the user instead of
      // silently saving a phantom 'sent' message.
      try {
        if (last.channel === MessageChannel.SMS) {
          // SMS replies go via the user's adfi twilio number.
          const phone = await ctx.db.phoneNumber.findFirst({
            where: { userId: ctx.user.id, status: "ACTIVE" },
          });
          if (!phone) throw new Error("no active adfi number to send from");
          await sendSms({
            from: phone.number,
            to: last.fromAddress,
            body: input.body,
          });
        } else if (last.channel === MessageChannel.TELEGRAM) {
          const account = await ctx.db.connectedAccount.findFirst({
            where: {
              userId: ctx.user.id,
              provider: Provider.TELEGRAM,
              disconnectedAt: null,
            },
          });
          if (!account) {
            throw new Error(
              "no connected telegram bot — reconnect on /settings",
            );
          }
          await sendTelegramMessage({
            token: decryptToken(account.encryptedToken),
            chatId: last.fromAddress,
            text: input.body,
          });
        } else if (
          last.channel === MessageChannel.MESSENGER ||
          last.channel === MessageChannel.INSTAGRAM_DM
        ) {
          const provider =
            last.channel === MessageChannel.INSTAGRAM_DM
              ? Provider.INSTAGRAM
              : Provider.FACEBOOK;
          const account = await ctx.db.connectedAccount.findFirst({
            where: {
              userId: ctx.user.id,
              provider,
              disconnectedAt: null,
            },
          });
          if (!account) {
            throw new Error(
              `no connected ${provider.toLowerCase()} account — reconnect on /settings`,
            );
          }
          await sendMessengerReply({
            pageAccessToken: decryptToken(account.encryptedToken),
            recipientPsid: last.fromAddress,
            text: input.body,
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Surface user-actionable errors verbatim (missing connection, etc.);
        // route opaque provider errors (rate limit, billing, 5xx) to admins.
        const userActionable =
          msg.toLowerCase().includes("no connected") ||
          msg.toLowerCase().includes("no active");
        if (userActionable) {
          throw OrbError.VALIDATION(msg);
        }
        await notifyAdminOfError({
          source: "messaging.sendReply",
          error: err,
          meta: {
            userId: ctx.user.id,
            channel: last.channel,
            threadId: input.threadId,
          },
        });
        throw OrbError.EXTERNAL_API("the messaging service");
      }

      return ctx.db.message.create({
        data: {
          userId: ctx.user.id,
          businessId: ctx.currentBusinessId,
          threadId: input.threadId,
          channel: last.channel,
          fromAddress: last.fromAddress,
          direction: Direction.OUTBOUND,
          body: input.body,
          handledBy: "user",
        },
      });
    }),

  // Mark thread as human-handled by updating handledBy on existing messages.
  // Signal reads this on next inbound; if "user", it won't auto-reply.
  takeOver: authedProc
    .input(z.object({ threadId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.message.updateMany({
        where: { userId: ctx.user.id, threadId: input.threadId },
        data: { handledBy: "user" },
      });
      return { handedOff: true as const };
    }),

  letSignalHandle: authedProc
    .input(z.object({ threadId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.message.updateMany({
        where: { userId: ctx.user.id, threadId: input.threadId },
        data: { handledBy: "signal" },
      });
      return { handedBack: true as const };
    }),
});
