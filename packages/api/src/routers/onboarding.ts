import { z } from "zod";
import { Agent, Goal, PhoneNumberStatus, Plan, type Prisma } from "@orb/db";
import { router, authedProc, publicProc } from "../trpc";
import { OrbError } from "../errors";
import { runStrategist } from "../agents/strategist";
import { provisionNumber } from "../services/twilio";
import {
  RateLimitError,
  attachEmailToPreview,
  runOnboardingPreview,
} from "../services/onboarding-preview";

function ipFromHeaders(headers: Headers): string {
  // Vercel sets x-forwarded-for; fall back to x-real-ip for self-hosted runs.
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "0.0.0.0";
}

export const onboardingRouter = router({
  // Public, unauthenticated. Generates a one-shot demo (brand voice + first
  // post + hero image) so visitors see real output before they sign up.
  // Cost ~6¢/call; production should add an IP-based rate limit (Vercel KV
  // or similar) before this is on a public landing page.
  previewDemo: publicProc
    .input(
      z.object({
        businessDescription: z.string().min(10).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await runOnboardingPreview({
          businessDescription: input.businessDescription,
          ip: ipFromHeaders(ctx.headers),
        });
      } catch (error) {
        if (error instanceof RateLimitError) {
          throw OrbError.VALIDATION(error.message);
        }
        const msg = error instanceof Error ? error.message : String(error);
        console.error("onboarding preview failed:", error);
        throw OrbError.EXTERNAL_API(msg);
      }
    }),

  savePreview: publicProc
    .input(
      z.object({
        resumeToken: z.string().min(8).max(64),
        email: z.string().email(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        return await attachEmailToPreview({
          resumeToken: input.resumeToken,
          email: input.email,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw OrbError.VALIDATION(msg);
      }
    }),

  saveBusinessDescription: authedProc
    .input(z.object({ text: z.string().min(10).max(500) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.update({
        where: { id: ctx.user.id },
        data: { businessDescription: input.text },
      });
      return { step: 1 as const };
    }),

  saveGoal: authedProc
    .input(z.object({ goal: z.nativeEnum(Goal) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.update({
        where: { id: ctx.user.id },
        data: { goal: input.goal },
      });
      return { step: 2 as const };
    }),

  runAnalysis: authedProc.input(z.void()).mutation(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({ where: { id: ctx.user.id } });
    if (!user) throw OrbError.NOT_FOUND("user");
    if (!user.businessDescription || !user.goal) {
      throw OrbError.VALIDATION(
        "Business description and goal required before analysis",
      );
    }

    let result;
    try {
      result = await runStrategist({
        businessDescription: user.businessDescription,
        goal: user.goal,
        userId: ctx.user.id,
      });
    } catch (error) {
      console.error("Strategist failed:", error);
      throw OrbError.EXTERNAL_API("Claude");
    }

    const brandVoice = result as unknown as Prisma.InputJsonValue;

    // Write to the active business's AgentContext. Multi-business
    // means we no longer have a single AgentContext per user — each
    // Business has its own. ctx.currentBusinessId is resolved by the
    // tRPC middleware once per request.
    const businessId = ctx.currentBusinessId;
    if (businessId) {
      await ctx.db.agentContext.upsert({
        where: { businessId },
        update: {
          strategistOutput: brandVoice,
          lastRefreshedAt: new Date(),
        },
        create: {
          userId: ctx.user.id,
          businessId,
          strategistOutput: brandVoice,
          lastRefreshedAt: new Date(),
        },
      });
    } else {
      // No business yet — bootstrap path (fresh signup before
      // business.create has run). Fall back to userId-only upsert,
      // which writes to whichever AgentContext exists or creates a
      // new one without a businessId. ensureCurrentBusiness will
      // attach a businessId on next access.
      const existing = await ctx.db.agentContext.findFirst({
        where: { userId: ctx.user.id },
      });
      if (existing) {
        await ctx.db.agentContext.update({
          where: { id: existing.id },
          data: { strategistOutput: brandVoice, lastRefreshedAt: new Date() },
        });
      } else {
        await ctx.db.agentContext.create({
          data: {
            userId: ctx.user.id,
            strategistOutput: brandVoice,
            lastRefreshedAt: new Date(),
          },
        });
      }
    }

    const event = await ctx.db.agentEvent.create({
      data: {
        userId: ctx.user.id,
        agent: Agent.STRATEGIST,
        eventType: "analysis_complete",
        payload: brandVoice,
      },
    });

    return { jobId: event.id };
  }),

  getAnalysisResult: authedProc
    .input(z.object({ jobId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const event = await ctx.db.agentEvent.findFirst({
        where: {
          id: input.jobId,
          userId: ctx.user.id,
          eventType: "analysis_complete",
        },
      });
      if (!event) return { pending: true as const };
      return { pending: false as const, result: event.payload };
    }),

  createCustomer: authedProc
    .input(z.object({ stripePaymentMethodId: z.string() }))
    .mutation(() => {
      throw OrbError.EXTERNAL_API("Stripe");
    }),

  startTrial: authedProc
    .input(z.object({ plan: z.nativeEnum(Plan) }))
    .mutation(() => {
      throw OrbError.EXTERNAL_API("Stripe");
    }),

  provisionPhone: authedProc.input(z.void()).mutation(async ({ ctx }) => {
    const existing = await ctx.db.phoneNumber.findFirst({
      where: {
        userId: ctx.user.id,
        status: PhoneNumberStatus.ACTIVE,
      },
    });
    if (existing) {
      return { number: existing.number };
    }

    const webhookBaseUrl =
      process.env.NEXT_PUBLIC_WEB_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

    if (!webhookBaseUrl) {
      throw OrbError.VALIDATION(
        "NEXT_PUBLIC_WEB_URL or VERCEL_URL must be set to provision a number",
      );
    }

    try {
      const provisioned = await provisionNumber({ webhookBaseUrl });
      await ctx.db.phoneNumber.create({
        data: {
          userId: ctx.user.id,
          number: provisioned.number,
          twilioSid: provisioned.twilioSid,
          status: PhoneNumberStatus.ACTIVE,
        },
      });
      return { number: provisioned.number };
    } catch (error) {
      // TEMP diag for 20003 debugging: log shape (no secrets) on every failure
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const token = process.env.TWILIO_AUTH_TOKEN;
      const base = process.env.NEXT_PUBLIC_WEB_URL;
      console.error(
        "Phone provisioning failed:",
        error,
        " | DIAG sid=",
        sid ? `${sid.slice(0, 2)}***len=${sid.length}` : "MISSING",
        "token=",
        token ? `***len=${token.length}` : "MISSING",
        "webhookBase=",
        base ?? "FALLBACK_VERCEL_URL",
      );
      throw OrbError.EXTERNAL_API("Twilio");
    }
  }),

  connectInstagram: authedProc
    .input(z.object({ oauthCode: z.string() }))
    .mutation(() => {
      throw OrbError.EXTERNAL_API("Meta");
    }),

  complete: authedProc.input(z.void()).mutation(async ({ ctx }) => {
    const user = await ctx.db.user.update({
      where: { id: ctx.user.id },
      data: { onboardedAt: new Date() },
    });
    return { onboardedAt: user.onboardedAt };
  }),
});
