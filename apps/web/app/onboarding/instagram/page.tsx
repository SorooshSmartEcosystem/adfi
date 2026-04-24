import { redirect } from "next/navigation";
import { createServerClient } from "@orb/auth/server";
import { InstagramForm } from "./instagram-form";

export default async function OnboardingInstagramPage() {
  const supabase = await createServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/signin");
  return <InstagramForm />;
}
