import { z } from "zod";
import { router, authedProc } from "../trpc";
import { OrbError } from "../errors";

const EmailSchema = z.string().email().max(254).toLowerCase();

export const subscribersRouter = router({
  list: authedProc
    .input(
      z
        .object({
          status: z.enum(["ACTIVE", "UNSUBSCRIBED", "BOUNCED"]).optional(),
          limit: z.number().min(1).max(500).default(200),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const status = input?.status ?? "ACTIVE";
      const limit = input?.limit ?? 200;
      const items = await ctx.db.subscriber.findMany({
        where: { userId: ctx.user.id, status },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          source: true,
          createdAt: true,
        },
      });
      const counts = await ctx.db.subscriber.groupBy({
        by: ["status"],
        where: { userId: ctx.user.id },
        _count: { _all: true },
      });
      const countByStatus: Record<string, number> = {
        ACTIVE: 0,
        UNSUBSCRIBED: 0,
        BOUNCED: 0,
      };
      for (const c of counts) {
        countByStatus[c.status] = c._count._all;
      }
      return { items, countByStatus };
    }),

  add: authedProc
    .input(
      z.object({
        email: EmailSchema,
        name: z.string().max(120).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Re-activate if already exists; create otherwise.
      const existing = await ctx.db.subscriber.findUnique({
        where: { userId_email: { userId: ctx.user.id, email: input.email } },
      });
      if (existing) {
        return ctx.db.subscriber.update({
          where: { id: existing.id },
          data: {
            status: "ACTIVE",
            unsubscribedAt: null,
            ...(input.name && { name: input.name }),
          },
        });
      }
      return ctx.db.subscriber.create({
        data: {
          userId: ctx.user.id,
          email: input.email,
          ...(input.name && { name: input.name }),
          source: "manual",
        },
      });
    }),

  // Bulk import from a list of email addresses (or "name <email>" strings).
  importBulk: authedProc
    .input(
      z.object({
        emails: z.array(EmailSchema).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let added = 0;
      let reactivated = 0;
      let skipped = 0;
      for (const email of input.emails) {
        try {
          const existing = await ctx.db.subscriber.findUnique({
            where: { userId_email: { userId: ctx.user.id, email } },
          });
          if (existing) {
            if (existing.status !== "ACTIVE") {
              await ctx.db.subscriber.update({
                where: { id: existing.id },
                data: { status: "ACTIVE", unsubscribedAt: null },
              });
              reactivated++;
            } else {
              skipped++;
            }
          } else {
            await ctx.db.subscriber.create({
              data: { userId: ctx.user.id, email, source: "csv_import" },
            });
            added++;
          }
        } catch {
          skipped++;
        }
      }
      return { added, reactivated, skipped };
    }),

  remove: authedProc
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const sub = await ctx.db.subscriber.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!sub) throw OrbError.NOT_FOUND("subscriber");
      await ctx.db.subscriber.update({
        where: { id: sub.id },
        data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
      });
      return { ok: true as const };
    }),
});
