import { redirect } from "next/navigation";
import { createServerClient } from "@orb/auth/server";
import { trpcServer } from "../../../lib/trpc-server";
import { AnalysisClient } from "./analysis-client";

export default async function OnboardingAnalysisPage() {
  const supabase = await createServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/signin");

  const trpc = await trpcServer();
  const user = await trpc.user.me();

  if (!user.businessDescription) redirect("/onboarding");
  if (!user.goal) redirect("/onboarding/goal");

  return (
    <main className="min-h-screen flex items-center justify-center px-lg py-2xl">
      <AnalysisClient />
    </main>
  );
}
