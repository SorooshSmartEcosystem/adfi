import { z } from "zod";
import { ContentFormat, DraftStatus, Platform, Prisma } from "@orb/db";
import { router, authedProc } from "../trpc";
import { OrbError } from "../errors";
import {
  draftPlanItem,
  generateDailyContent,
  regenerateDraftContent,
} from "../agents/echo";
import { generateWeeklyPlan, startOfWeek } from "../agents/planner";
import { summarizePerformance } from "../services/performance";

const paginationInput = z.object({
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
});

export const contentRouter = router({
  listDrafts: authedProc
    .input(
      paginationInput.extend({
        status: z.nativeEnum(DraftStatus).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const drafts = await ctx.db.contentDraft.findMany({
        where: {
          userId: ctx.user.id,
          ...(input.status && { status: input.status }),
        },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor && {
          cursor: { id: input.cursor },
          skip: 1,
        }),
      });

      let nextCursor: string | null = null;
      if (drafts.length > input.limit) {
        const next = drafts.pop();
        nextCursor = next?.id ?? null;
      }
      return { items: drafts, nextCursor };
    }),

  getDraft: authedProc
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const draft = await ctx.db.contentDraft.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!draft) throw OrbError.NOT_FOUND("draft");
      return draft;
    }),

  approveDraft: authedProc
    .input(
      z.object({
        id: z.string().uuid(),
        variant: z.enum(["primary", "alternate"]).default("primary"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const draft = await ctx.db.contentDraft.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!draft) throw OrbError.NOT_FOUND("draft");
      if (draft.status !== DraftStatus.AWAITING_REVIEW) {
        throw OrbError.VALIDATION(
          `Draft is ${draft.status.toLowerCase()}, not awaiting review`,
        );
      }

      // If the alternate was chosen, swap it into the primary slot so
      // downstream publishing reads `content` regardless of which won.
      if (input.variant === "alternate" && draft.alternateContent) {
        return ctx.db.contentDraft.update({
          where: { id: draft.id },
          data: {
            status: DraftStatus.APPROVED,
            approvedAt: new Date(),
            content: draft.alternateContent as Prisma.InputJsonValue,
            alternateContent: draft.content as Prisma.InputJsonValue,
            chosenVariant: "alternate",
          },
        });
      }

      return ctx.db.contentDraft.update({
        where: { id: draft.id },
        data: {
          status: DraftStatus.APPROVED,
          approvedAt: new Date(),
          chosenVariant: "primary",
        },
      });
    }),

  rejectDraft: authedProc
    .input(
      z.object({
        id: z.string().uuid(),
        reason: z.string().max(300).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const draft = await ctx.db.contentDraft.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!draft) throw OrbError.NOT_FOUND("draft");
      if (draft.status !== DraftStatus.AWAITING_REVIEW) {
        throw OrbError.VALIDATION(
          `Draft is ${draft.status.toLowerCase()}, not awaiting review`,
        );
      }
      return ctx.db.contentDraft.update({
        where: { id: draft.id },
        data: {
          status: DraftStatus.REJECTED,
          rejectedAt: new Date(),
          rejectionReason: input.reason ?? null,
        },
      });
    }),

  generate: authedProc
    .input(
      z.object({
        hint: z.string().max(300).optional(),
        format: z.nativeEnum(ContentFormat).optional(),
        platform: z.nativeEnum(Platform).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const draftId = await generateDailyContent(
          ctx.user.id,
          input.hint,
          input.format,
          input.platform,
        );
        return { draftId };
      } catch (error) {
        if (error instanceof Error && error.message.includes("Brand voice")) {
          throw OrbError.VALIDATION(error.message);
        }
        console.error("Echo generate failed:", error);
        throw OrbError.EXTERNAL_API("Claude");
      }
    }),

  regenerateDraft: authedProc
    .input(
      z.object({
        id: z.string().uuid(),
        hint: z.string().max(300).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const draft = await ctx.db.contentDraft.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!draft) throw OrbError.NOT_FOUND("draft");
      try {
        await regenerateDraftContent(input.id, input.hint);
        return { success: true as const };
      } catch (error) {
        if (error instanceof Error && error.message.includes("Brand voice")) {
          throw OrbError.VALIDATION(error.message);
        }
        console.error("Echo regenerate failed:", error);
        throw OrbError.EXTERNAL_API("Claude");
      }
    }),

  listPosts: authedProc
    .input(
      paginationInput.extend({
        platform: z.nativeEnum(Platform).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const posts = await ctx.db.contentPost.findMany({
        where: {
          userId: ctx.user.id,
          ...(input.platform && { platform: input.platform }),
        },
        orderBy: { publishedAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor && {
          cursor: { id: input.cursor },
          skip: 1,
        }),
      });

      let nextCursor: string | null = null;
      if (posts.length > input.limit) {
        const next = posts.pop();
        nextCursor = next?.id ?? null;
      }
      return { items: posts, nextCursor };
    }),

  // ============================================================
  // Weekly content plan (Planner agent).
  // ============================================================

  getCurrentPlan: authedProc.input(z.void()).query(async ({ ctx }) => {
    const weekStart = startOfWeek(new Date());
    const plan = await ctx.db.contentPlan.findUnique({
      where: { userId_weekStart: { userId: ctx.user.id, weekStart } },
      include: {
        items: {
          orderBy: { scheduledFor: "asc" },
          include: {
            draft: {
              select: { id: true, status: true, format: true },
            },
          },
        },
      },
    });
    return plan;
  }),

  generatePlan: authedProc
    .input(z.object({ weekOf: z.date().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await generateWeeklyPlan(ctx.user.id, input?.weekOf);
        return result;
      } catch (error) {
        if (error instanceof Error && error.message.includes("Brand voice")) {
          throw OrbError.VALIDATION(error.message);
        }
        console.error("Planner failed:", error);
        throw OrbError.EXTERNAL_API("Claude");
      }
    }),

  // Drafts a single plan item via Echo. The item gets a draftId + DRAFTED
  // status; the resulting ContentDraft sits in AWAITING_REVIEW.
  draftPlanItem: authedProc
    .input(z.object({ itemId: z.string().uuid(), hint: z.string().max(300).optional() }))
    .mutation(async ({ ctx, input }) => {
      // Auth: the plan item must belong to a plan owned by this user.
      const item = await ctx.db.contentPlanItem.findUnique({
        where: { id: input.itemId },
        select: { plan: { select: { userId: true } } },
      });
      if (!item || item.plan.userId !== ctx.user.id) {
        throw OrbError.NOT_FOUND("plan item");
      }

      try {
        const draftId = await draftPlanItem(input.itemId, input.hint);
        return { draftId };
      } catch (error) {
        console.error("Echo draftPlanItem failed:", error);
        throw OrbError.EXTERNAL_API("Claude");
      }
    }),

  getPerformanceSummary: authedProc
    .input(z.object({ windowDays: z.number().min(7).max(365).default(90) }).optional())
    .query(async ({ ctx, input }) => {
      return summarizePerformance(ctx.user.id, input?.windowDays ?? 90);
    }),

  skipPlanItem: authedProc
    .input(z.object({ itemId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.contentPlanItem.findUnique({
        where: { id: input.itemId },
        select: { plan: { select: { userId: true } } },
      });
      if (!item || item.plan.userId !== ctx.user.id) {
        throw OrbError.NOT_FOUND("plan item");
      }
      await ctx.db.contentPlanItem.update({
        where: { id: input.itemId },
        data: { status: "SKIPPED" },
      });
      return { ok: true as const };
    }),
});
