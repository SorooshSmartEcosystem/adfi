import { z } from "zod";
import { router, authedProc } from "../trpc";
import { OrbError } from "../errors";
import {
  renderScriptForDraft,
  renderDirectiveForDraft,
} from "../services/motion-reel";
import { runVideoAgent } from "../agents/video";
import { getActiveAgentContextForUser } from "../services/agent-context";
import type { BrandVoice } from "../agents/strategist";
import { notifyAdminOfError } from "../services/admin-notify";

// =============================================================
// Scene-script schema (current canonical shape)
// =============================================================
// Mirror of @orb/motion-reel/types Scene + VideoScript. Replicated as
// Zod here so tRPC validates without pulling the React-heavy renderer
// package into the validator path.

const SceneSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("hook"),
    headline: z.string().min(1).max(40),
    subtitle: z.string().max(120).optional(),
    duration: z.number().min(1.5).max(8),
  }),
  z.object({
    type: z.literal("stat"),
    value: z.union([z.number(), z.string()]),
    prefix: z.string().max(8).optional(),
    suffix: z.string().max(8).optional(),
    label: z.string().min(2).max(40),
    duration: z.number().min(1.5).max(8),
  }),
  z.object({
    type: z.literal("contrast"),
    leftLabel: z.string().min(2).max(40),
    leftValue: z.string().min(1).max(20),
    rightLabel: z.string().min(2).max(40),
    rightValue: z.string().min(1).max(20),
    caption: z.string().max(140).optional(),
    duration: z.number().min(1.5).max(8),
  }),
  z.object({
    type: z.literal("quote"),
    quote: z.string().min(20).max(200),
    emphasis: z.string().max(40).optional(),
    attribution: z.string().max(80).optional(),
    duration: z.number().min(1.5).max(8),
  }),
  z.object({
    type: z.literal("punchline"),
    line: z.string().min(8).max(140),
    emphasis: z.string().max(40).optional(),
    duration: z.number().min(1.5).max(8),
  }),
  z.object({
    type: z.literal("list"),
    title: z.string().min(4).max(80),
    items: z
      .array(
        z.object({
          headline: z.string().min(2).max(60),
          body: z.string().max(120).optional(),
        }),
      )
      .min(2)
      .max(4),
    duration: z.number().min(2).max(10),
  }),
  z.object({
    type: z.literal("hashtags"),
    hashtags: z.array(z.string().min(2).max(40)).min(3).max(8),
    caption: z.string().max(120).optional(),
    duration: z.number().min(1.5).max(6),
  }),
  z.object({
    type: z.literal("brand-stamp"),
    cta: z.string().max(120).optional(),
    duration: z.number().min(1.5).max(6),
  }),
]);

const VideoDesignSchema = z.object({
  style: z.enum(["minimal", "bold", "warm", "editorial"]),
  accent: z.enum(["alive", "attn", "urgent", "ink"]),
  pace: z.enum(["slow", "medium", "fast"]),
  statusLabel: z.string().min(2).max(40),
  hookLabel: z.string().min(2).max(40),
  metaLabel: z.string().min(2).max(40),
  closerLabel: z.string().min(2).max(40),
});

const VideoScriptSchema = z.object({
  scenes: z.array(SceneSchema).min(2).max(10),
  design: VideoDesignSchema,
});

// =============================================================
// Legacy single-template directive schema (back-compat)
// =============================================================

const QuoteContentSchema = z.object({
  quote: z.string().min(1).max(280),
  attribution: z.string().max(80).optional(),
});

const StatContentSchema = z.object({
  value: z.union([z.number(), z.string()]),
  prefix: z.string().max(8).optional(),
  suffix: z.string().max(8).optional(),
  label: z.string().min(1).max(80),
  context: z.string().min(1).max(220),
});

const DirectiveSchema = z.discriminatedUnion("template", [
  z.object({
    template: z.literal("quote"),
    content: QuoteContentSchema,
    design: VideoDesignSchema.optional(),
  }),
  z.object({
    template: z.literal("stat"),
    content: StatContentSchema,
    design: VideoDesignSchema.optional(),
  }),
]);

// =============================================================
// Router
// =============================================================

export const motionReelRouter = router({
  // Generate a VideoScript from a content brief without rendering.
  // Caller can review/edit scenes before triggering renderForDraft.
  draftScript: authedProc
    .input(z.object({ brief: z.string().min(10).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const ac = await getActiveAgentContextForUser(ctx.user.id);
        const brandVoice = (ac?.strategistOutput ?? null) as BrandVoice | null;
        const businessRow = ctx.currentBusinessId
          ? await ctx.db.business.findUnique({
              where: { id: ctx.currentBusinessId },
              select: { name: true, description: true },
            })
          : null;
        const script = await runVideoAgent({
          brief: input.brief,
          brandVoice,
          businessName: businessRow?.name ?? undefined,
          industry: businessRow?.description ?? undefined,
          userId: ctx.user.id,
        });
        return script;
      } catch (err) {
        await notifyAdminOfError({
          source: "motionReel.draftScript",
          error: err,
          meta: { userId: ctx.user.id },
        });
        throw OrbError.EXTERNAL_API(
          "we're catching our breath — try again in a minute.",
        );
      }
    }),

  // Render a previously-drafted (and optionally edited) script.
  renderScript: authedProc
    .input(
      z.object({
        draftId: z.string().uuid(),
        script: VideoScriptSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await renderScriptForDraft({
          userId: ctx.user.id,
          draftId: input.draftId,
          script: input.script,
          cookieHeader: ctx.headers.get("cookie") ?? "",
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw OrbError.EXTERNAL_API(`motion-reel render failed: ${msg}`);
      }
    }),

  // One-shot: agent + render. Most common path from the make-video
  // button on draft cards.
  generateAndRender: authedProc
    .input(
      z.object({
        draftId: z.string().uuid(),
        brief: z.string().min(10).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const ac = await getActiveAgentContextForUser(ctx.user.id);
        const brandVoice = (ac?.strategistOutput ?? null) as BrandVoice | null;
        const businessRow = ctx.currentBusinessId
          ? await ctx.db.business.findUnique({
              where: { id: ctx.currentBusinessId },
              select: { name: true, description: true },
            })
          : null;
        const script = await runVideoAgent({
          brief: input.brief,
          brandVoice,
          businessName: businessRow?.name ?? undefined,
          industry: businessRow?.description ?? undefined,
          userId: ctx.user.id,
        });
        const result = await renderScriptForDraft({
          userId: ctx.user.id,
          draftId: input.draftId,
          script,
          cookieHeader: ctx.headers.get("cookie") ?? "",
        });
        return { script, ...result };
      } catch (err) {
        await notifyAdminOfError({
          source: "motionReel.generateAndRender",
          error: err,
          meta: { userId: ctx.user.id, draftId: input.draftId },
        });
        const msg = err instanceof Error ? err.message : String(err);
        throw OrbError.EXTERNAL_API(`motion-reel pipeline failed: ${msg}`);
      }
    }),

  // Legacy back-compat: render a single-template MotionDirective.
  // Kept so older drafts persisted under the directive shape still
  // render. New flows should use renderScript / generateAndRender.
  renderForDraft: authedProc
    .input(
      z.object({
        draftId: z.string().uuid(),
        directive: DirectiveSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await renderDirectiveForDraft({
          userId: ctx.user.id,
          draftId: input.draftId,
          directive: input.directive,
          cookieHeader: ctx.headers.get("cookie") ?? "",
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw OrbError.EXTERNAL_API(`motion-reel render failed: ${msg}`);
      }
    }),

  // Read the motion state of a draft.
  get: authedProc
    .input(z.object({ draftId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const draft = await ctx.db.contentDraft.findFirst({
        where: { id: input.draftId, userId: ctx.user.id },
        select: { id: true, motion: true },
      });
      if (!draft) throw OrbError.NOT_FOUND("draft");
      return draft.motion as Record<string, unknown> | null;
    }),
});
