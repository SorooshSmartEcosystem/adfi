import { z } from "zod";
import { router, authedProc } from "../trpc";
import { OrbError } from "../errors";
import {
  renderScriptForDraft,
  renderDirectiveForDraft,
} from "../services/motion-reel";
import { runVideoAgent, backfillImagesForVideoScript } from "../agents/video";
import { db } from "@orb/db";
import { getActiveAgentContextForUser } from "../services/agent-context";
import type { BrandVoice } from "../agents/strategist";
import { notifyAdminOfError } from "../services/admin-notify";

// =============================================================
// Scene-script schema (current canonical shape)
// =============================================================
// Mirror of @orb/motion-reel/types Scene + VideoScript. Replicated as
// Zod here so tRPC validates without pulling the React-heavy renderer
// package into the validator path.
//
// Caps are LENIENT: agents/video.ts already enforces stricter caps
// during agent parsing (with auto-truncation). The tRPC input validator
// is the LAST line of defense, so it should never reject a script the
// agent already produced — that just dead-ends the user. Anything
// genuinely malformed still fails (wrong types, missing fields).
const longish = (max: number) =>
  z
    .string()
    .min(1)
    .transform((s) => (s.length > max ? s.slice(0, max) : s));

// Mirrored from the agent's IconNameZ. Used as input validation
// when the renderScript mutation accepts an agent-emitted script.
const RouterIconNameZ = z.enum([
  "dollar",
  "percent",
  "trending-up",
  "trending-down",
  "chart-bar",
  "chart-line",
  "coin",
  "wallet",
  "credit-card",
  "bank",
  "rocket",
  "target",
  "sparkle",
  "lightbulb",
  "alert",
  "fire",
  "lightning",
  "check",
  "x",
  "heart",
  "message",
  "share",
  "users",
  "bookmark",
  "globe",
  "clock",
  "calendar",
  "mail",
  "phone",
  "lock",
  "shield",
  "search",
  "star",
  "play",
  "pause",
  "arrow-right",
  "arrow-up",
  "arrow-down",
]);

const SceneSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("hook"),
    headline: longish(80),
    subtitle: longish(200).optional(),
    icon: RouterIconNameZ.optional(),
    duration: z.number().min(1).max(10),
  }),
  z.object({
    type: z.literal("stat"),
    value: z.union([z.number(), z.string()]),
    prefix: longish(16).optional(),
    suffix: longish(16).optional(),
    label: longish(80),
    icon: RouterIconNameZ.optional(),
    duration: z.number().min(1).max(10),
  }),
  z.object({
    type: z.literal("data-bar"),
    title: longish(120).optional(),
    bars: z
      .array(
        z.object({
          label: longish(60),
          value: z.union([z.number(), z.string()]),
          prefix: longish(16).optional(),
          suffix: longish(16).optional(),
        }),
      )
      .min(1)
      .max(6),
    caption: longish(200).optional(),
    duration: z.number().min(1).max(12),
  }),
  z.object({
    type: z.literal("contrast"),
    leftLabel: longish(60),
    leftValue: longish(60),
    rightLabel: longish(60),
    rightValue: longish(60),
    caption: longish(200).optional(),
    duration: z.number().min(1).max(10),
  }),
  z.object({
    type: z.literal("quote"),
    quote: longish(280),
    emphasis: longish(60).optional(),
    attribution: longish(120).optional(),
    duration: z.number().min(1).max(10),
  }),
  z.object({
    type: z.literal("punchline"),
    line: longish(200),
    emphasis: longish(60).optional(),
    duration: z.number().min(1).max(10),
  }),
  z.object({
    type: z.literal("list"),
    title: longish(120),
    items: z
      .array(
        z.object({
          headline: longish(80),
          body: longish(180).optional(),
        }),
      )
      .min(1)
      .max(6),
    duration: z.number().min(1).max(12),
  }),
  z.object({
    type: z.literal("hashtags"),
    hashtags: z.array(longish(60)).min(1).max(10),
    caption: longish(180).optional(),
    duration: z.number().min(1).max(8),
  }),
  z.object({
    type: z.literal("brand-stamp"),
    cta: longish(180).optional(),
    duration: z.number().min(1).max(8),
  }),
  // ── editorial-bold preset ────────────────────────────────────
  z.object({
    type: z.literal("bold-statement"),
    lead: longish(120).optional(),
    hero: longish(180),
    emphasis: longish(60).optional(),
    trail: longish(120).optional(),
    duration: z.number().min(1).max(8),
  }),
  z.object({
    type: z.literal("icon-list"),
    title: longish(120).optional(),
    items: z
      .array(
        z.object({
          icon: RouterIconNameZ,
          label: longish(60),
        }),
      )
      .min(2)
      .max(8),
    highlightIndex: z.number().int().min(0).max(7).optional(),
    duration: z.number().min(1).max(10),
  }),
  z.object({
    type: z.literal("numbered-diagram"),
    title: longish(120).optional(),
    center: longish(80),
    callouts: z
      .array(z.object({ label: longish(120) }))
      .min(1)
      .max(4),
    duration: z.number().min(1).max(8),
  }),
  z.object({
    type: z.literal("editorial-opener"),
    motif: RouterIconNameZ.optional(),
    headline: longish(200),
    emphasis: longish(60).optional(),
    duration: z.number().min(1).max(7),
  }),
  z.object({
    type: z.literal("editorial-closer"),
    motif: RouterIconNameZ.optional(),
    cta: longish(180).optional(),
    duration: z.number().min(1).max(6),
  }),
  // Phase 3 — structural variety scenes. Permissive on enum-like
  // fields (sender / kind) — renderer falls back to a sensible
  // default if the value isn't recognized. Strict enums kept the
  // agent's grammar over Anthropic's compiler limit.
  z.object({
    type: z.literal("phone-mockup"),
    kind: longish(20),
    body: longish(220),
    author: longish(60).optional(),
    caption: longish(180).optional(),
    duration: z.number(),
  }),
  z.object({
    type: z.literal("metric-tile-grid"),
    title: longish(120).optional(),
    tiles: z.array(
      z.object({
        label: longish(60),
        value: z.union([z.number(), z.string()]),
        prefix: longish(16).optional(),
        suffix: longish(16).optional(),
        delta: longish(40).optional(),
      }),
    ),
    duration: z.number(),
  }),
  z.object({
    type: z.literal("chat-thread"),
    title: longish(120).optional(),
    messages: z.array(
      z.object({
        sender: longish(10),
        text: longish(300),
      }),
    ),
    duration: z.number(),
  }),
  z.object({
    type: z.literal("terminal"),
    title: longish(120).optional(),
    prompt: longish(8).optional(),
    lines: z.array(
      z.object({
        text: longish(200),
        kind: longish(10),
      }),
    ),
    duration: z.number(),
  }),
  // Hero photo (Phase 2.5) — agent emits imagePrompt, API backfills
  // imageUrl before render. Renderer falls back to solid frame if
  // URL missing.
  z.object({
    type: z.literal("hero-photo"),
    headline: longish(120),
    subhead: longish(180).optional(),
    emphasis: longish(60).optional(),
    imagePrompt: longish(500),
    imageUrl: z.string().url().optional(),
    textAnchor: longish(20).optional(),
    treatment: longish(20).optional(),
    duration: z.number().min(1).max(10),
  }),
]);

const VideoDesignSchema = z.object({
  style: z.enum(["minimal", "bold", "warm", "editorial"]),
  accent: z.enum(["alive", "attn", "urgent", "ink"]),
  pace: z.enum(["slow", "medium", "fast"]),
  statusLabel: longish(60),
  hookLabel: longish(60),
  metaLabel: longish(60),
  closerLabel: longish(60),
  mood: z
    .enum([
      "confident",
      "calm",
      "energetic",
      "urgent",
      "contemplative",
      "celebratory",
    ])
    .optional(),
});

const RouterPresetNameZ = z.enum([
  "editorial-bold",
  "dashboard-tech",
  "soft-minimal",
  "luxury",
  "studio-craft",
  "documentary",
  "generic",
]);

// narrativeArc + viralPotential added 2026-05-07. Both optional in the
// router validator so legacy persisted scripts (no arc, no score) keep
// rendering. Fresh agent output always emits them; user-edited scripts
// can omit them without breaking the render path.
const VideoScriptSchema = z.object({
  scenes: z.array(SceneSchema).min(2).max(10),
  design: VideoDesignSchema,
  preset: RouterPresetNameZ.optional(),
  narrativeArc: z.string().optional(),
  viralPotential: z.number().optional(),
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
        // If the agent emitted hero-photo scenes, generate the photos
        // before returning. Backfill is best-effort — if Replicate
        // fails the scene renders without a photo (HeroPhotoScene
        // falls back to a solid frame).
        const kit = await db.brandKit.findFirst({
          where: { userId: ctx.user.id },
          select: { imageStyle: true },
        });
        const filled = await backfillImagesForVideoScript({
          script,
          userId: ctx.user.id,
          imageStyle: kit?.imageStyle ?? undefined,
        });
        return filled;
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
        // Backfill hero-photo images before rendering. Non-blocking
        // failures handled inside backfillImagesForVideoScript.
        const kit = await db.brandKit.findFirst({
          where: { userId: ctx.user.id },
          select: { imageStyle: true },
        });
        const filled = await backfillImagesForVideoScript({
          script,
          userId: ctx.user.id,
          draftId: input.draftId,
          imageStyle: kit?.imageStyle ?? undefined,
        });
        const result = await renderScriptForDraft({
          userId: ctx.user.id,
          draftId: input.draftId,
          script: filled,
          cookieHeader: ctx.headers.get("cookie") ?? "",
        });
        return { script: filled, ...result };
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
