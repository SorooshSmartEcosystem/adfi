import { redirect } from "next/navigation";
import { getCurrentUser } from "@orb/auth/server";
import { PageHero } from "../../../components/shared/page-hero";
import { BrandKitPanel } from "../../../components/brand-kit/brandkit-panel";

// BrandKit landing page — design system + downloadable assets, all
// generated from the user's voice + business description. The interactive
// panel reads everything via tRPC; this server component is a thin wrapper
// for auth + page chrome.
export default async function BrandKitPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/signin");

  return (
    <>
      <PageHero
        title="brand kit"
        sub="palette, typography, logo variants, and the look every image i generate inherits."
      />
      <BrandKitPanel />
    </>
  );
}
