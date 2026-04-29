import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@orb/auth/server";
import { trpcServer } from "../../../lib/trpc-server";
import { PageHero } from "../../../components/shared/page-hero";
import { CampaignsList } from "../../../components/campaigns/campaigns-list";
import { CampaignsUpsellCard } from "../../../components/campaigns/upsell-card";

// Campaigns list page. Plan-gated: SOLO + TEAM users see the upsell
// card; STUDIO + AGENCY see the actual list + a "+ new campaign" CTA.
export default async function CampaignsPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/signin");

  // Server-side plan check so the page chrome reflects access without
  // a flash of "campaigns…" → upsell card.
  const trpc = await trpcServer();
  const list = await trpc.campaigns.list();
  if (!list.canRunCampaigns) {
    return (
      <>
        <PageHero
          title="campaigns"
          sub="paid ads — meta, google, youtube. one brief, every channel, hands-off."
        />
        <CampaignsUpsellCard />
      </>
    );
  }

  return (
    <>
      <PageHero
        title="campaigns"
        sub="paid ads — meta, google, youtube. one brief, every channel."
        right={
          <Link
            href="/campaigns/new"
            className="bg-ink text-white text-xs font-medium px-md py-[8px] rounded-full hover:opacity-85 transition-opacity"
          >
            + new campaign
          </Link>
        }
      />
      <CampaignsList />
    </>
  );
}
