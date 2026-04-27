import { z } from "zod";
import { Provider } from "@orb/db";
import { router, authedProc } from "../trpc";

// Read + disconnect connected oauth accounts (Meta/IG/etc.). Tokens never
// leave the server — this router only exposes provider + display fields.
export const connectionsRouter = router({
  list: authedProc.input(z.void()).query(async ({ ctx }) => {
    const rows = await ctx.db.connectedAccount.findMany({
      where: { userId: ctx.user.id, disconnectedAt: null },
      select: {
        id: true,
        provider: true,
        externalId: true,
        scope: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
    return rows;
  }),

  disconnect: authedProc
    .input(z.object({ provider: z.nativeEnum(Provider) }))
    .mutation(async ({ ctx, input }) => {
      // Soft-disconnect — keep the row so the dashboard's per-user financials
      // can still attribute past activity, but stop using the token.
      await ctx.db.connectedAccount.updateMany({
        where: { userId: ctx.user.id, provider: input.provider },
        data: { disconnectedAt: new Date() },
      });
      return { ok: true as const };
    }),
});
