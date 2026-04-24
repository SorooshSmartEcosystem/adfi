import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@orb/auth/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/signin");

  // Admin role check
  const role = user.app_metadata?.["role"] as string | undefined;
  const allowedEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const emailAllowed =
    user.email && allowedEmails.includes(user.email.toLowerCase());

  if (role !== "admin" && !emailAllowed) {
    return (
      <main className="min-h-screen flex items-center justify-center px-lg">
        <div className="flex flex-col items-center gap-lg max-w-sm text-center">
          <div className="flex items-center gap-md">
            <span
              className="inline-block w-sm h-sm rounded-full bg-urgent"
              aria-hidden
            />
            <h1 className="text-2xl font-medium tracking-tight">ADFI admin</h1>
          </div>
          <p className="text-sm text-ink2 font-mono">
            you're signed in as <span className="text-ink">{user.email}</span>,
            but this email isn't on the admin list.
          </p>
          <p className="text-xs text-ink4 font-mono">
            add your email to the ADMIN_EMAILS env var (comma-separated) in
            Vercel settings, then redeploy.
          </p>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-sm text-ink3 font-mono underline"
            >
              sign out
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-lg py-md hairline-bottom flex items-center justify-between">
        <div className="flex items-center gap-md">
          <span
            className="inline-block w-xs h-xs rounded-full bg-alive"
            aria-hidden
          />
          <Link href="/dashboard" className="text-md font-medium tracking-tight">
            ADFI admin
          </Link>
        </div>
        <nav className="flex items-center gap-lg text-sm font-mono text-ink3">
          <Link href="/dashboard" className="hover:text-ink transition-colors">
            overview
          </Link>
          <Link
            href="/dashboard/users"
            className="hover:text-ink transition-colors"
          >
            users
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit" className="hover:text-ink transition-colors">
              sign out
            </button>
          </form>
        </nav>
      </header>
      <main className="flex-1 px-lg py-2xl">{children}</main>
    </div>
  );
}
