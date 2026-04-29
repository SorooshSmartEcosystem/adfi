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

  // Per-business brand voice. Reads the AgentContext for the user's
  // ACTIVE business — without this, multi-business users always see
  // their first business's voice regardless of which they switched to.
  const userRow = await db.user.findUnique({
    where: { id: authUser.id },
    select: { currentBusinessId: true },
  });
  const ctxRow = userRow?.currentBusinessId
    ? await db.agentContext.findUnique({
        where: { businessId: userRow.currentBusinessId },
        select: { strategistOutput: true, lastRefreshedAt: true },
      })
    : null;

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
