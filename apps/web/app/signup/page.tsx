import { redirect } from "next/navigation";
import { createServerClient } from "@orb/auth/server";
import { AuthCard } from "../../components/auth/auth-card";
import { AuthHomeLink } from "../../components/auth/auth-home-link";

// Already-signed-in users land on the dashboard instead of the form.
export default async function SignUpPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center px-lg py-2xl">
      <AuthHomeLink />
      <AuthCard mode="signup" />
    </main>
  );
}
