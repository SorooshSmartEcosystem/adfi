import { z } from "zod";
import {
  db,
  Agent,
  ContentFormat,
  ContentPlanStatus,
  ContentPlanItemStatus,
  Platform,
  type Prisma,
} from "@orb/db";
import {
  anthropic,
  jsonSchemaForAnthropic,
  MODELS,
  recordAnthropicUsage,
} from "../services/anthropic";
import {
  performanceForPrompt,
  summarizePerformance,
  type PerformanceSummary,
} from "../services/performance";
import { CREDIT_COSTS, consumeCredits } from "../services/quota";
import { PLANNER_SYSTEM_PROMPT } from "./prompts/planner";

const PlannerOutputSchema = z.object({
  thesis: z.string(),
  biggestBet: z.string(),
  gapsSpotted: z.array(z.string()),
  items: z
    .array(
      z.object({
        dayOffset: z.number().min(0).max(6),
        hourLocal: z.number().min(0).max(23),
        platform: z.enum(["INSTAGRAM", "LINKEDIN", "EMAIL", "FACEBOOK"]),
        format: z.enum([
          "SINGLE_POST",
          "CAROUSEL",
          "REEL_SCRIPT",
          "EMAIL_NEWSLETTER",
          "STORY_SEQUENCE",
        ]),
        angle: z.string(),
        hookIdea: z.string(),
        intent: z.enum([
          "build_trust",
          "drive_inquiry",
          "drive_sale",
          "build_authority",
          "build_community",
        ]),
        audience: z.string(),
        pillar: z.string(),
        reasoning: z.string(),
      }),
    )
    .min(3)
    .max(5),
});

export type PlannerOutput = z.infer<typeof PlannerOutputSchema>;

export async function runPlanner(args: {
  businessDescription: string;
  brandVoice: unknown;
  performance: PerformanceSummary;
  weekStart: Date;
  weekEnd: Date;
  previousPlan?: { thesis: string; angles: string[] } | null;
  userId?: string;
}): Promise<PlannerOutput> {
  const performanceText = performanceForPrompt(args.performance);

  const prevText = args.previousPlan
    ? `Last week's thesis: "${args.previousPlan.thesis}"\nLast week's angles:\n${args.previousPlan.angles.map((a, i) => `${i + 1}. ${a}`).join("\n")}\n\nDon't repeat any of those angles.`
    : "(no previous plan — this is the first week)";

  const userMessage = `Business description:
${args.businessDescription || "(not set)"}

Brand voice fingerprint:
${JSON.stringify(args.brandVoice ?? {}, null, 2)}

Week of: ${args.weekStart.toISOString().slice(0, 10)} → ${args.weekEnd.toISOString().slice(0, 10)}

Recent post performance (most recent first):
${performanceText}

Previous plan (avoid repeating):
${prevText}

Brief Echo on this week's plan.`;

  const response = await anthropic().messages.create({
    model: MODELS.OPUS,
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: PLANNER_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
    output_config: {
      format: {
        type: "json_schema",
        schema: jsonSchemaForAnthropic(PlannerOutputSchema),
      },
    },
  });

  if (args.userId) {
    void recordAnthropicUsage({
      userId: args.userId,
      agent: Agent.STRATEGIST,
      eventType: "planner_run",
      response,
    });
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error(
      `Planner returned no text content (stop_reason: ${response.stop_reason})`,
    );
  }

  const raw = JSON.parse(textBlock.text);
  return PlannerOutputSchema.parse(raw);
}

// Returns the Monday-anchored start of the week containing `d`. The Planner
// always plans whole weeks, Mon–Sun.
export function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + offsetToMonday);
  return x;
}

// Orchestration: run the Planner for a user, persist a ContentPlan + items.
// If a plan already exists for the same week, archives the old one first.
export async function generateWeeklyPlan(
  userId: string,
  weekStartOverride?: Date,
): Promise<{ planId: string; itemsCreated: number }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { agentContexts: true },
  });
  if (!user) throw new Error("User not found");
  if (!user.agentContexts?.[0]?.strategistOutput) {
    throw new Error("Brand voice not set — run Strategist first");
  }

  await consumeCredits(userId, CREDIT_COSTS.PLANNER, "planner_weekly");

  const weekStart = startOfWeek(weekStartOverride ?? new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const performance = await summarizePerformance(userId, 90);

  // Previous plan (the most recent ACTIVE one whose week_start is before this one).
  const previousPlan = await db.contentPlan.findFirst({
    where: {
      userId,
      weekStart: { lt: weekStart },
    },
    orderBy: { weekStart: "desc" },
    include: { items: true },
  });

  const previousPlanArg = previousPlan
    ? {
        thesis: previousPlan.thesis ?? "",
        angles: previousPlan.items.map((i) => i.angle),
      }
    : null;

  const result = await runPlanner({
    businessDescription: user.businessDescription ?? "",
    brandVoice: user.agentContexts?.[0]?.strategistOutput,
    performance,
    weekStart,
    weekEnd,
    previousPlan: previousPlanArg,
    userId,
  });

  // Archive any existing plan for this user/week (defensive — there's a
  // unique constraint, so if one exists we replace it cleanly).
  const existing = await db.contentPlan.findUnique({
    where: { userId_weekStart: { userId, weekStart } },
  });
  if (existing) {
    await db.contentPlanItem.deleteMany({ where: { planId: existing.id } });
    await db.contentPlan.delete({ where: { id: existing.id } });
  }

  const plan = await db.contentPlan.create({
    data: {
      userId,
      businessId: user.currentBusinessId ?? null,
      weekStart,
      weekEnd,
      thesis: result.thesis,
      reasoning: {
        biggestBet: result.biggestBet,
        gapsSpotted: result.gapsSpotted,
      } as Prisma.InputJsonValue,
      status: ContentPlanStatus.ACTIVE,
      items: {
        create: result.items.map((item) => {
          const scheduled = new Date(weekStart);
          scheduled.setDate(scheduled.getDate() + item.dayOffset);
          scheduled.setHours(item.hourLocal, 0, 0, 0);
          return {
            scheduledFor: scheduled,
            platform: item.platform as Platform,
            format: item.format as ContentFormat,
            angle: item.angle,
            hookIdea: item.hookIdea,
            intent: item.intent,
            audience: item.audience,
            pillar: item.pillar,
            reasoning: item.reasoning,
            status: ContentPlanItemStatus.PLANNED,
          };
        }),
      },
    },
    include: { items: true },
  });

  await db.agentEvent.create({
    data: {
      userId,
      agent: Agent.STRATEGIST,
      eventType: "weekly_plan_created",
      payload: {
        planId: plan.id,
        weekStart: weekStart.toISOString(),
        itemsCount: plan.items.length,
        thesis: result.thesis,
      },
    },
  });

  return { planId: plan.id, itemsCreated: plan.items.length };
}
