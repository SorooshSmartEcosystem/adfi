import { redirect } from "next/navigation";
import { getCurrentUser } from "@orb/auth/server";
import { db } from "@orb/db";
import { AGENTS } from "../../../../components/specialists/agent-config";
import { SpecialistPageLayout } from "../../../../components/specialist/specialist-page-layout";
import { RecentDraftsGrid } from "../../../../components/specialist/recent-drafts-grid";

export default async function EchoPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/signin");

  const agent = AGENTS.echo!;

  // Per-business drafts. Falls back to userId match for legacy rows
  // that pre-date the multi-business migration's businessId backfill.
  const userRow = await db.user.findUnique({
    where: { id: authUser.id },
    select: { currentBusinessId: true },
  });
  const businessId = userRow?.currentBusinessId ?? null;
  const drafts = await db.contentDraft.findMany({
    where: businessId
      ? {
          OR: [
            { businessId },
            { businessId: null, userId: authUser.id },
          ],
        }
      : { userId: authUser.id },
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
