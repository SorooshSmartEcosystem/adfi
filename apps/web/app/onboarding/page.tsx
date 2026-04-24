import { redirect } from "next/navigation";
import { createServerClient } from "@orb/auth/server";
import { trpcServer } from "../../lib/trpc-server";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/signin");

  const trpc = await trpcServer();
  const user = await trpc.user.me();

  return <OnboardingForm initialText={user.businessDescription ?? ""} />;
}
