import { z } from "zod";
import { router, authedProc } from "../trpc";
import { OrbError } from "../errors";

export const callsRouter = router({
  list: authedProc
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const calls = await ctx.db.call.findMany({
        where: { userId: ctx.user.id },
        orderBy: { startedAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor && {
          cursor: { id: input.cursor },
          skip: 1,
        }),
      });
      let nextCursor: string | null = null;
      if (calls.length > input.limit) {
        const next = calls.pop();
        nextCursor = next?.id ?? null;
      }
      return { items: calls, nextCursor };
    }),

  get: authedProc
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const call = await ctx.db.call.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        include: { appointments: true },
      });
      if (!call) throw OrbError.NOT_FOUND("call");
      return call;
    }),

  getTranscript: authedProc
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const call = await ctx.db.call.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        select: { transcriptUrl: true },
      });
      if (!call) throw OrbError.NOT_FOUND("call");
      if (!call.transcriptUrl) throw OrbError.NOT_FOUND("transcript");
      // Full transcript text gets stored by the Vapi webhook (deferred).
      // For now, return the audio URL and an empty text — clients can stream audio.
      return { text: "", audioUrl: call.transcriptUrl };
    }),

  getLiveCallState: authedProc.input(z.void()).query(() => {
    // Live call infrastructure (Vapi websocket bridge) is deferred.
    // Returning null matches the API.md contract for "no active call".
    return null;
  }),
});
