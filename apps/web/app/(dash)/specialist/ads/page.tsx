import { redirect } from "next/navigation";
import { getCurrentUser } from "@orb/auth/server";
import { db } from "@orb/db";
import Link from "next/link";
import { AGENTS } from "../../../../components/specialists/agent-config";
import { SpecialistPageLayout } from "../../../../components/specialist/specialist-page-layout";
import { EmptyCard } from "../../../../components/specialist/empty-card";

export default async function AdsSpecialistPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/signin");

  const agent = AGENTS.ads!;

  // Per-business campaigns. Campaign.businessId is non-nullable in
  // the schema (campaigns can't exist without a Business), so no
  // legacy null fallback is needed — just filter to the active one.
  const userRow = await db.user.findUnique({
    where: { id: authUser.id },
    select: { currentBusinessId: true },
  });
  const businessId = userRow?.currentBusinessId ?? null;
  const campaigns = businessId
    ? await db.campaign.findMany({
        where: { businessId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          status: true,
          platforms: true,
          createdAt: true,
        },
      })
    : [];

  return (
    <SpecialistPageLayout
      name={agent.name}
      tier={agent.tier}
      description={agent.role}
      dbAgent={agent.dbAgent}
      phrases={agent.phrases}
    >
      {campaigns.length === 0 ? (
        <EmptyCard
          title="no campaigns yet"
          body="tell me what to promote, the budget, and the platforms — i'll draft a complete campaign across meta, google, and tiktok. you click approve once and i handle every platform."
          cta="+ new campaign"
          href="/campaigns/new"
        />
      ) : (
        <>
          <div className="flex items-center justify-between mb-md mt-sm">
            <h2 className="text-md font-medium">recent campaigns</h2>
            <Link
              href="/campaigns"
              className="font-mono text-[11px] text-ink2 hover:text-ink"
            >
              see all →
            </Link>
          </div>
          <div className="bg-white border-hairline border-border rounded-2xl overflow-hidden">
            {campaigns.map((c, i) => (
              <Link
                key={c.id}
                href={`/campaigns/${c.id}`}
                className={`block px-xl py-lg hover:bg-surface2 transition-colors ${
                  i < campaigns.length - 1
                    ? "hairline-b2 border-border2"
                    : ""
                }`}
              >
                <div className="font-mono text-[11px] text-ink4 mb-xs tracking-wider">
                  {c.status.toLowerCase()} ·{" "}
                  {c.platforms.join(", ").toLowerCase() || "no platform"}
                </div>
                <div className="text-sm font-medium leading-snug">{c.name}</div>
              </Link>
            ))}
          </div>
        </>
      )}
    </SpecialistPageLayout>
  );
}
