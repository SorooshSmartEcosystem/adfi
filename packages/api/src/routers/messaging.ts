import { z } from "zod";
import { Direction, MessageChannel } from "@orb/db";
import { router, authedProc } from "../trpc";
import { OrbError } from "../errors";

export const messagingRouter = router({
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
          userId: ctx.user.id,
          ...(input.channel && { channel: input.channel }),
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
        where: { userId: ctx.user.id, threadId: input.threadId },
        orderBy: { createdAt: "asc" },
      });
      if (messages.length === 0) throw OrbError.NOT_FOUND("thread");
      return messages;
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
      return ctx.db.message.create({
        data: {
          userId: ctx.user.id,
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
