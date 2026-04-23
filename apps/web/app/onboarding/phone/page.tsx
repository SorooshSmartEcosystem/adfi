import { redirect } from "next/navigation";
import { createServerClient } from "@orb/auth/server";
import { trpcServer } from "../../../lib/trpc-server";
import { PhoneForm } from "./phone-form";

export default async function OnboardingPhonePage() {
  const supabase = await createServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/signin");

  const trpc = await trpcServer();
  const user = await trpc.user.me();

  if (!user.businessDescription) redirect("/onboarding");
  if (!user.goal) redirect("/onboarding/goal");

  // Check for an existing active number — no need to provision again.
  const home = await trpc.user.getHomeData();
  const existingNumber = home.phoneStatus.active ? home.phoneStatus.number : null;

  return (
    <main className="min-h-screen flex items-center justify-center px-lg py-2xl">
      <PhoneForm existingNumber={existingNumber} />
    </main>
  );
}
