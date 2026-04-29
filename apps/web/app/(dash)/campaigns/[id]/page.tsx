import { redirect } from "next/navigation";
import { getCurrentUser } from "@orb/auth/server";
import { PageHero } from "../../../../components/shared/page-hero";
import { CampaignDetail } from "../../../../components/campaigns/campaign-detail";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/signin");
  const { id } = await params;

  return (
    <>
      <PageHero
        title="campaign"
        sub="review the draft, edit anything, approve all variants in one click."
      />
      <CampaignDetail campaignId={id} />
    </>
  );
}
