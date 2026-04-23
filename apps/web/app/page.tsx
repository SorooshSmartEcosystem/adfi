import Link from "next/link";
import { createServerClient } from "@orb/auth/server";
import { HealthDot } from "../components/health-dot";

export default async function Home() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-xl">
      <div className="flex items-center gap-md">
        <HealthDot />
        <h1 className="text-4xl font-medium tracking-tight">ADFI</h1>
      </div>
      <Link
        href={user ? "/me" : "/signin"}
        className="text-sm text-ink3 font-mono underline"
      >
        {user ? "home →" : "sign in →"}
      </Link>
    </main>
  );
}
