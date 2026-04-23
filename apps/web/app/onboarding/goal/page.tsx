import { redirect } from "next/navigation";
import { createServerClient } from "@orb/auth/server";
import { trpcServer } from "../../../lib/trpc-server";
import { GoalForm } from "./goal-form";

export default async function OnboardingGoalPage() {
  const supabase = await createServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/signin");

  const trpc = await trpcServer();
  const user = await trpc.user.me();

  if (!user.businessDescription) redirect("/onboarding");

  return (
    <main className="min-h-screen flex items-center justify-center px-lg">
      <GoalForm initialGoal={user.goal} />
    </main>
  );
}
