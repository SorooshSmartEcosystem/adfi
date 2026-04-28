import { redirect } from "next/navigation";
import { createServerClient } from "@orb/auth/server";
import { trpcServer } from "../../../../lib/trpc-server";
import { AGENTS } from "../../../../components/specialists/agent-config";
import { SpecialistPageLayout } from "../../../../components/specialist/specialist-page-layout";
import { FindingsList } from "../../../../components/specialist/findings-list";

export default async function SignalPage() {
  const supabase = await createServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/signin");

  const agent = AGENTS.signal!;
  const trpc = await trpcServer();
  const findings = await trpc.insights.listFindings({
    agent: "SIGNAL",
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
        emptyHint="quiet for now — i'll surface anything that needs your eyes."
      />
    </SpecialistPageLayout>
  );
}
