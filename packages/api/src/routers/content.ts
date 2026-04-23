import { z } from "zod";
import { DraftStatus, Platform } from "@orb/db";
import { router, authedProc } from "../trpc";
import { OrbError } from "../errors";
import {
  generateDailyContent,
  regenerateDraftContent,
} from "../agents/echo";

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
    .input(z.object({ id: z.string().uuid() }))
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
          status: DraftStatus.APPROVED,
          approvedAt: new Date(),
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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const draftId = await generateDailyContent(ctx.user.id, input.hint);
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
});
