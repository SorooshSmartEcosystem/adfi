import { redirect } from "next/navigation";
import { getCurrentUser } from "@orb/auth/server";
import { db } from "@orb/db";
import { PlanForm } from "./plan-form";

export default async function OnboardingPlanPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/signin");

  // Skip the plan step if the user already has an active paid plan —
  // existing users adding a 2nd business shouldn't be prompted to pick
  // a plan they already have. Only TRIALING and ACTIVE count;
  // canceled/past_due users still see the picker.
  const sub = await db.subscription.findFirst({
    where: {
      userId: authUser.id,
      status: { in: ["TRIALING", "ACTIVE"] },
    },
    select: { id: true },
  });
  if (sub) {
    // Existing paying user — skip ahead to the next step.
    redirect("/onboarding/phone");
  }

  return <PlanForm />;
}
