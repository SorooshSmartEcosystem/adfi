import { z } from "zod";
import { ContentFormat, DraftStatus, Platform, Prisma, Provider } from "@orb/db";
import { router, authedProc } from "../trpc";
import { OrbError } from "../errors";
import {
  backfillImagesForDraft,
  draftPlanItem,
  generateDailyContent,
  regenerateDraftContent,
} from "../agents/echo";
import { generateWeeklyPlan, startOfWeek } from "../agents/planner";
import { summarizePerformance } from "../services/performance";
import { publishNewsletter, testSendNewsletter } from "../services/newsletter";
import { sendMessage as sendTelegramMessage } from "../services/telegram";
import { decryptToken } from "../services/crypto";
import { notifyAdminOfError } from "../services/admin-notify";

const paginationInput = z.object({
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
});

// Flatten an Echo draft body into a single Telegram message. Telegram cap is
// 4096 chars. Mirrors the same shape the manual-publish "copy text" button
// produces, so the channel sees the same thing the user would have copied.
function telegramTextFromDraft(content: unknown): string {
  if (!content || typeof content !== "object") return "";
  const c = content as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof c.hook === "string" && c.hook.trim()) parts.push(c.hook.trim());
  if (typeof c.body === "string" && c.body.trim()) parts.push(c.body.trim());
  if (typeof c.cta === "string" && c.cta.trim()) parts.push(c.cta.trim());
  return parts.join("\n\n").slice(0, 4096);
}

export const contentRouter = router({
  listDrafts: authedProc
    .input(
      paginationInput.extend({
        status: z.nativeEnum(DraftStatus).optional(),
        platform: z.nativeEnum(Platform).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const drafts = await ctx.db.contentDraft.findMany({
        where: {
          // Scope to the active business so STUDIO/AGENCY users see
          // only the drafts that belong to the business they're
          // currently looking at. Falls back to userId for any draft
          // row that hasn't been backfilled yet (shouldn't happen
          // post-migration but the fallback is cheap).
          OR: [
            { businessId: ctx.currentBusinessId },
            { businessId: null, userId: ctx.user.id },
          ],
          ...(input.status && { status: input.status }),
          ...(input.platform && { platform: input.platform }),
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
        await notifyAdminOfError({
          source: "content.generate",
          error,
          meta: {
            userId: ctx.user.id,
            format: input.format ?? null,
            platform: input.platform ?? null,
          },
        });
        throw OrbError.EXTERNAL_API("the writing service");
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
        await notifyAdminOfError({
          source: "content.regenerateDraft",
          error,
          meta: { userId: ctx.user.id, draftId: input.id },
        });
        throw OrbError.EXTERNAL_API("the writing service");
      }
    }),

  // Inline edits to a single draft's content JSON. Validates length budgets
  // but otherwise trusts the format-specific shape — undefined fields are
  // left untouched.
  updateDraftContent: authedProc
    .input(
      z.object({
        id: z.string().uuid(),
        hook: z.string().max(500).optional(),
        body: z.string().max(4000).optional(),
        cta: z.string().max(280).nullable().optional(),
        hashtags: z.array(z.string().max(60)).max(20).optional(),
        caption: z.string().max(4000).optional(),
        subject: z.string().max(140).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const draft = await ctx.db.contentDraft.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!draft) throw OrbError.NOT_FOUND("draft");
      const current = (draft.content ?? {}) as Record<string, unknown>;
      const next: Record<string, unknown> = { ...current };
      for (const k of ["hook", "body", "cta", "hashtags", "caption", "subject"] as const) {
        if (input[k] !== undefined) next[k] = input[k];
      }
      await ctx.db.contentDraft.update({
        where: { id: draft.id },
        data: { content: next as unknown as Prisma.InputJsonValue },
      });
      return { success: true as const };
    }),

  regenerateImages: authedProc
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const draft = await ctx.db.contentDraft.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!draft) throw OrbError.NOT_FOUND("draft");
      try {
        await backfillImagesForDraft(draft.id, draft.userId, draft.platform);
        return { success: true as const };
      } catch (error) {
        await notifyAdminOfError({
          source: "content.regenerateImages",
          error,
          meta: { userId: ctx.user.id, draftId: input.id },
        });
        throw OrbError.EXTERNAL_API("the image service");
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
          OR: [
            { businessId: ctx.currentBusinessId },
            { businessId: null, userId: ctx.user.id },
          ],
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
        await notifyAdminOfError({
          source: "content.generatePlan",
          error,
          meta: { userId: ctx.user.id, weekOf: input?.weekOf?.toISOString() ?? null },
        });
        throw OrbError.EXTERNAL_API("the planning service");
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
        await notifyAdminOfError({
          source: "content.draftPlanItem",
          error,
          meta: { userId: ctx.user.id, itemId: input.itemId },
        });
        throw OrbError.EXTERNAL_API("the writing service");
      }
    }),

  getPerformanceSummary: authedProc
    .input(
      z
        .object({
          windowDays: z.number().min(7).max(365).default(90),
          platform: z.nativeEnum(Platform).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return summarizePerformance(
        ctx.user.id,
        input?.windowDays ?? 90,
        input?.platform,
      );
    }),

  publishDraft: authedProc
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const draft = await ctx.db.contentDraft.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!draft) throw OrbError.NOT_FOUND("draft");
      if (draft.status !== DraftStatus.APPROVED) {
        throw OrbError.VALIDATION(
          "Approve the draft before publishing it.",
        );
      }
      if (draft.platform === Platform.EMAIL) {
        try {
          const result = await publishNewsletter({
            draftId: draft.id,
            userId: ctx.user.id,
            businessId: ctx.currentBusinessId,
          });
          return result;
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          console.error("Newsletter publish failed:", error);
          // Classify so the toast tells the user something useful instead
          // of "SendGrid is having issues — I'll retry" for what's really
          // a missing-prerequisite or quota problem.
          const lower = msg.toLowerCase();
          if (
            lower.includes("no subscribers") ||
            lower.includes("missing subject") ||
            lower.includes("missing sections") ||
            lower.includes("draft is missing") ||
            lower.includes("credit")
          ) {
            throw OrbError.VALIDATION(msg);
          }
          await notifyAdminOfError({
            source: "content.publishDraft.newsletter",
            error,
            meta: { userId: ctx.user.id, draftId: draft.id },
          });
          throw OrbError.EXTERNAL_API("the email delivery service");
        }
      }

      if (draft.platform === Platform.TELEGRAM) {
        // Pick the user's connected channel. We don't ask the user to pick one
        // here because v1 expects one channel per user; if multiple are
        // connected we use the most recently created.
        const channel = await ctx.db.connectedAccount.findFirst({
          where: {
            userId: ctx.user.id,
            provider: Provider.TELEGRAM_CHANNEL,
            disconnectedAt: null,
          },
          orderBy: { createdAt: "desc" },
        });
        if (!channel) {
          throw OrbError.VALIDATION(
            "no telegram channel connected — add one on /settings",
          );
        }
        const text = telegramTextFromDraft(draft.content);
        if (!text) {
          throw OrbError.VALIDATION("draft has no postable text");
        }
        try {
          const sent = await sendTelegramMessage({
            token: decryptToken(channel.encryptedToken),
            chatId: channel.externalId,
            text,
          });
          await ctx.db.contentDraft.update({
            where: { id: draft.id },
            data: { status: DraftStatus.PUBLISHED },
          });
          await ctx.db.contentPost.create({
            data: {
              userId: ctx.user.id,
              businessId: ctx.currentBusinessId,
              draftId: draft.id,
              platform: Platform.TELEGRAM,
              externalId: String(sent.messageId),
              permalink: channel.scope?.startsWith("@")
                ? `https://t.me/${channel.scope.slice(1)}/${sent.messageId}`
                : null,
              publishedAt: new Date(),
            },
          });
          return { ok: true as const, messageId: sent.messageId };
        } catch (error) {
          await notifyAdminOfError({
            source: "content.publishDraft.telegram",
            error,
            meta: {
              userId: ctx.user.id,
              draftId: draft.id,
              channelExternalId: channel.externalId,
            },
          });
          throw OrbError.EXTERNAL_API("the telegram service");
        }
      }

      throw OrbError.VALIDATION(
        "this platform doesn't auto-publish yet — use 'mark as posted' once you've shared it",
      );
    }),

  // Mark a draft as posted on a manual-publish platform (Twitter for v1).
// Twitter's API tier costs money we won't pay for v1; the user copies the
// content + posts via twitter.com/intent/tweet, then taps "mark as posted"
// so the draft moves out of the queue and shows up in /content?tab=performance.
  markAsPosted: authedProc
    .input(
      z.object({
        id: z.string().uuid(),
        permalink: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const draft = await ctx.db.contentDraft.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!draft) throw OrbError.NOT_FOUND("draft");
      if (
        draft.platform !== Platform.TWITTER &&
        draft.platform !== Platform.WEBSITE_ARTICLE
      ) {
        throw OrbError.VALIDATION(
          "this platform publishes through adfi — use the publish flow",
        );
      }
      const now = new Date();
      await ctx.db.contentDraft.update({
        where: { id: draft.id },
        data: {
          status: DraftStatus.PUBLISHED,
          approvedAt: draft.approvedAt ?? now,
        },
      });
      await ctx.db.contentPost.create({
        data: {
          userId: ctx.user.id,
          businessId: ctx.currentBusinessId,
          draftId: draft.id,
          platform: draft.platform,
          externalId: input.permalink ?? `manual-${draft.id}`,
          permalink: input.permalink ?? null,
          publishedAt: now,
        },
      });
      return { ok: true as const };
    }),

  testSendNewsletter: authedProc
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await testSendNewsletter({
          draftId: input.id,
          userId: ctx.user.id,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        const lower = msg.toLowerCase();
        if (
          lower.includes("missing subject") ||
          lower.includes("missing sections") ||
          lower.includes("draft is missing") ||
          lower.includes("no owner email")
        ) {
          throw OrbError.VALIDATION(msg);
        }
        await notifyAdminOfError({
          source: "content.testSendNewsletter",
          error,
          meta: { userId: ctx.user.id, draftId: input.id },
        });
        throw OrbError.EXTERNAL_API("the email delivery service");
      }
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
