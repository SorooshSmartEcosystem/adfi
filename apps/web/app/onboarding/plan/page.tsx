import { redirect } from "next/navigation";
import { createServerClient } from "@orb/auth/server";
import { PlanForm } from "./plan-form";

export default async function OnboardingPlanPage() {
  const supabase = await createServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/signin");
  return <PlanForm />;
}
