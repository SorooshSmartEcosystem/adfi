import { redirect } from "next/navigation";
import { createServerClient } from "@orb/auth/server";
import { trpcServer } from "../../../../lib/trpc-server";
import { PageHero } from "../../../../components/shared/page-hero";
import { CampaignBriefForm } from "../../../../components/campaigns/campaign-brief-form";
import { CampaignsUpsellCard } from "../../../../components/campaigns/upsell-card";

export default async function NewCampaignPage() {
  const supabase = await createServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/signin");

  const trpc = await trpcServer();
  const list = await trpc.campaigns.list();
  if (!list.canRunCampaigns) {
    return (
      <>
        <PageHero
          title="new campaign"
          sub="paid ads — meta, google, youtube. one brief, every channel."
        />
        <CampaignsUpsellCard />
      </>
    );
  }

  return (
    <>
      <PageHero
        title="new campaign"
        sub="tell me what to promote. i'll draft it across every platform you pick — one approval click."
      />
      <CampaignBriefForm />
    </>
  );
}
