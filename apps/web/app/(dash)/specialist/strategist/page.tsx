import { redirect } from "next/navigation";
import { getCurrentUser } from "@orb/auth/server";
import { db } from "@orb/db";
import { AGENTS } from "../../../../components/specialists/agent-config";
import { SpecialistPageLayout } from "../../../../components/specialist/specialist-page-layout";
import { BrandVoicePanel } from "../../../../components/specialists/brand-voice-panel";

export default async function StrategistPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/signin");

  const agent = AGENTS.strategist!;
  const ctxRow = await db.agentContext.findFirst({
    where: { userId: authUser.id },
    select: { strategistOutput: true, lastRefreshedAt: true },
  });
  const brandVoice =
    (ctxRow?.strategistOutput as Record<string, unknown> | null) ?? null;
  const lastRefreshedAt = ctxRow?.lastRefreshedAt ?? null;

  return (
    <SpecialistPageLayout
      name={agent.name}
      tier={agent.tier}
      description={agent.role}
      dbAgent={agent.dbAgent}
      phrases={agent.phrases}
    >
      <BrandVoicePanel voice={brandVoice} lastRefreshedAt={lastRefreshedAt} />
    </SpecialistPageLayout>
  );
}
