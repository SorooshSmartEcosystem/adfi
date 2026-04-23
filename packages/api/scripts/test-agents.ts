import { db, Agent, type Prisma } from "@orb/db";
import {
  runStrategist,
  generateDailyContent,
  generateCompetitorIntel,
  generatePulseSignals,
} from "../src";

const MAYA_ID = "00000000-0000-0000-0000-000000000001";

async function main() {
  const user = await db.user.findUnique({ where: { id: MAYA_ID } });
  if (!user) throw new Error("Maya not seeded — run `pnpm db:seed` first.");
  if (!user.goal) throw new Error("Maya has no goal set.");

  console.log("[1/4] Running Strategist (claude-opus-4-7)...");
  const brandVoice = await runStrategist({
    businessDescription: user.businessDescription ?? "",
    goal: user.goal,
  });
  console.log("  voice:   " + brandVoice.voiceTone.join(" · "));
  console.log("  pillars: " + brandVoice.contentPillars.join(" · "));

  const brandVoiceJson = brandVoice as unknown as Prisma.InputJsonValue;
  await db.agentContext.upsert({
    where: { userId: MAYA_ID },
    update: {
      strategistOutput: brandVoiceJson,
      lastRefreshedAt: new Date(),
    },
    create: {
      userId: MAYA_ID,
      strategistOutput: brandVoiceJson,
      lastRefreshedAt: new Date(),
    },
  });
  await db.agentEvent.create({
    data: {
      userId: MAYA_ID,
      agent: Agent.STRATEGIST,
      eventType: "analysis_complete",
      payload: brandVoiceJson,
    },
  });

  console.log("\n[2/4] Running Echo (claude-opus-4-7)...");
  const draftId = await generateDailyContent(MAYA_ID);
  const draft = await db.contentDraft.findUnique({ where: { id: draftId } });
  const content = draft?.content as { caption?: string; pillar?: string };
  console.log("  pillar:      " + (content.pillar ?? "(none)"));
  console.log("  voice match: " + draft?.voiceMatchScore?.toString());
  console.log(
    "  caption:     " +
      (content.caption ?? "").slice(0, 100).split("\n").join(" ") + "...",
  );

  console.log("\n[3/4] Running Scout (claude-sonnet-4-6)...");
  const scoutResult = await generateCompetitorIntel(MAYA_ID);
  console.log("  findings created: " + scoutResult.findingsCreated);
  const competitors = await db.competitor.findMany({
    where: { userId: MAYA_ID },
  });
  for (const c of competitors) {
    const activity = c.recentActivity as
      | { watchFor?: string[]; recentIntuition?: string | null }
      | null;
    if (activity?.watchFor) {
      console.log(
        `  ${c.name}: ${activity.watchFor.slice(0, 2).map((w) => `"${w}"`).join(" + ")}`,
      );
    }
  }

  console.log("\n[4/4] Running Pulse (claude-sonnet-4-6)...");
  const pulseResult = await generatePulseSignals(MAYA_ID);
  console.log("  signals created: " + pulseResult.findingsCreated);
  const recentFindings = await db.finding.findMany({
    where: { userId: MAYA_ID, agent: Agent.PULSE },
    orderBy: { createdAt: "desc" },
    take: 4,
  });
  for (const f of recentFindings) {
    console.log(`  · [${f.severity.toLowerCase()}] ${f.summary}`);
  }

  console.log("\n✓ All 4 agents working end-to-end.");
  await db.$disconnect();
}

main().catch(async (error) => {
  console.error("\n✗ FAILED:", error);
  await db.$disconnect();
  process.exit(1);
});
