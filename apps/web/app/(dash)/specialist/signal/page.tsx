import { redirect } from "next/navigation";
import { getCurrentUser } from "@orb/auth/server";
import { trpcServer } from "../../../../lib/trpc-server";
import { AGENTS } from "../../../../components/specialists/agent-config";
import { SpecialistPageLayout } from "../../../../components/specialist/specialist-page-layout";
import { FindingsList } from "../../../../components/specialist/findings-list";
import { FaqEditor } from "./faq-editor";

export default async function SignalPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/signin");

  const agent = AGENTS.signal!;
  const trpc = await trpcServer();
  const [findings, faq] = await Promise.all([
    trpc.insights.listFindings({ agent: "SIGNAL", limit: 6 }),
    trpc.business.getFaq(),
  ]);

  return (
    <SpecialistPageLayout
      name={agent.name}
      tier={agent.tier}
      description={agent.role}
      dbAgent={agent.dbAgent}
      phrases={agent.phrases}
    >
      <FaqEditor initial={faq.faqText} />
      <FindingsList
        findings={findings}
        emptyHint="quiet for now — i'll surface anything that needs your eyes."
      />
    </SpecialistPageLayout>
  );
}
