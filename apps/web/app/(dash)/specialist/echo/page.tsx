import { redirect } from "next/navigation";
import { createServerClient } from "@orb/auth/server";
import { db } from "@orb/db";
import { AGENTS } from "../../../../components/specialists/agent-config";
import { SpecialistPageLayout } from "../../../../components/specialist/specialist-page-layout";
import { RecentDraftsGrid } from "../../../../components/specialist/recent-drafts-grid";

export default async function EchoPage() {
  const supabase = await createServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/signin");

  const agent = AGENTS.echo!;
  const drafts = await db.contentDraft.findMany({
    where: { userId: authUser.id },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      id: true,
      format: true,
      status: true,
      createdAt: true,
      content: true,
    },
  });

  return (
    <SpecialistPageLayout
      name={agent.name}
      tier={agent.tier}
      description={agent.role}
      dbAgent={agent.dbAgent}
      phrases={agent.phrases}
    >
      <RecentDraftsGrid drafts={drafts} />
    </SpecialistPageLayout>
  );
}
