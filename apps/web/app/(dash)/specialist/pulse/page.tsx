import { redirect } from "next/navigation";
import { getCurrentUser } from "@orb/auth/server";
import { trpcServer } from "../../../../lib/trpc-server";
import { AGENTS } from "../../../../components/specialists/agent-config";
import { SpecialistPageLayout } from "../../../../components/specialist/specialist-page-layout";
import { FindingsList } from "../../../../components/specialist/findings-list";

export default async function PulsePage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/signin");

  const agent = AGENTS.pulse!;
  const trpc = await trpcServer();
  const findings = await trpc.insights.listFindings({
    agent: "PULSE",
    limit: 6,
  });

  return (
    <SpecialistPageLayout
      name={agent.name}
      tier={agent.tier}
      description={agent.role}
      dbAgent={agent.dbAgent}
      phrases={agent.phrases}
    >
      <FindingsList
        findings={findings}
        emptyHint="nothing surfaced yet — check back after the next run."
      />
    </SpecialistPageLayout>
  );
}
