// AgentContext access helpers.
//
// AgentContext is now per-Business (was per-User before the
// 2026-04-28 multi-business reshape). These helpers center the
// businessId-keyed lookup so callsites don't have to remember
// whether to use findUnique({ businessId }) or findFirst({ userId,
// businessId }) etc.
//
// For cron/agent paths where businessId isn't passed explicitly,
// `getActiveAgentContextForUser` falls back to the user's
// currentBusinessId. SOLO/TEAM accounts have one business so this
// always returns the right one; STUDIO/AGENCY users run agents
// against whichever business is currently active in their session.
// (Per-business cron iteration that runs each business of a
// multi-business user is parked work — see project_multi_business
// memory.)

import { db, type Prisma } from "@orb/db";

export type AgentContextSummary = {
  id: string;
  userId: string;
  businessId: string;
  strategistOutput: Prisma.JsonValue | null;
  voiceFingerprint: Prisma.JsonValue | null;
  pausedAgents: ("STRATEGIST" | "SCOUT" | "PULSE" | "ADS" | "ECHO" | "SIGNAL")[];
  lastManualRun: Prisma.JsonValue | null;
  lastRefreshedAt: Date | null;
};

// Returns the AgentContext for a specific Business, creating a
// blank row if one doesn't exist yet. Use this from any code path
// that already knows the businessId (tRPC procedures, business-
// scoped agent runs, the new-business onboarding form).
export async function getOrCreateAgentContextForBusiness(args: {
  userId: string;
  businessId: string;
}) {
  const existing = await db.agentContext.findUnique({
    where: { businessId: args.businessId },
  });
  if (existing) return existing;
  return db.agentContext.create({
    data: {
      userId: args.userId,
      businessId: args.businessId,
    },
  });
}

// Returns the AgentContext for the user's currently-active Business
// without creating one. Used by the dashboard layout's onboarding
// gate (no voice → redirect to /onboarding) and other read-only
// surfaces.
export async function getActiveAgentContextForUser(
  userId: string,
): Promise<AgentContextSummary | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { currentBusinessId: true },
  });
  if (!user?.currentBusinessId) return null;
  const ctx = await db.agentContext.findUnique({
    where: { businessId: user.currentBusinessId },
  });
  if (!ctx) return null;
  return {
    id: ctx.id,
    userId: ctx.userId,
    businessId: ctx.businessId!,
    strategistOutput: ctx.strategistOutput,
    voiceFingerprint: ctx.voiceFingerprint,
    pausedAgents: ctx.pausedAgents as AgentContextSummary["pausedAgents"],
    lastManualRun: ctx.lastManualRun,
    lastRefreshedAt: ctx.lastRefreshedAt,
  };
}

// Upserts AgentContext fields for a specific Business. Use from
// agents that produce/refresh per-business state (Strategist run,
// Scout watching list update, Pulse signal feed update, Echo voice
// fingerprint refresh).
//
// Casts the create branch to UncheckedCreateInput so the userId +
// businessId scalars satisfy Prisma's "either checked-with-relation
// OR unchecked-with-FKs" requirement. This is the standard escape
// hatch for upsert with composite keys.
export async function updateAgentContextForBusiness(args: {
  userId: string;
  businessId: string;
  data: Prisma.AgentContextUpdateInput;
}) {
  return db.agentContext.upsert({
    where: { businessId: args.businessId },
    update: args.data,
    create: {
      ...(args.data as unknown as Prisma.AgentContextUncheckedCreateInput),
      userId: args.userId,
      businessId: args.businessId,
    } as Prisma.AgentContextUncheckedCreateInput,
  });
}
