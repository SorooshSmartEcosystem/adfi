import { z } from "zod";
import { Agent, Goal, Plan, type Prisma } from "@orb/db";
import { router, authedProc } from "../trpc";
import { OrbError } from "../errors";
import { runStrategist } from "../agents/strategist";

export const onboardingRouter = router({
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
      });
    } catch (error) {
      console.error("Strategist failed:", error);
      throw OrbError.EXTERNAL_API("Claude");
    }

    const brandVoice = result as unknown as Prisma.InputJsonValue;

    await ctx.db.agentContext.upsert({
      where: { userId: ctx.user.id },
      update: {
        strategistOutput: brandVoice,
        lastRefreshedAt: new Date(),
      },
      create: {
        userId: ctx.user.id,
        strategistOutput: brandVoice,
        lastRefreshedAt: new Date(),
      },
    });

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

  provisionPhone: authedProc.input(z.void()).mutation(() => {
    throw OrbError.EXTERNAL_API("Twilio");
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
