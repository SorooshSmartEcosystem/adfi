import { redirect } from "next/navigation";
import { createServerClient } from "@orb/auth/server";

export default async function AdminHome() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");
  redirect("/signin");
}
