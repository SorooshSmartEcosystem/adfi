import { redirect } from "next/navigation";
import { createServerClient } from "@orb/auth/server";
import { BrandKitOnboardingForm } from "./brandkit-form";

export default async function OnboardingBrandKitPage() {
  const supabase = await createServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/signin");

  return <BrandKitOnboardingForm />;
}
