import { redirect } from "next/navigation";
import { createServerClient } from "@orb/auth/server";
import { db } from "@orb/db";
import { getDashUserAndHome } from "../../lib/trpc-server";
import { AppShell } from "../../components/app-shell/app-shell";

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "—";
}

export default async function DashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/signin");

  // Onboarding gate — without a brand voice the agents can't do anything
  // meaningful and several specialist pages 500. Bounce to onboarding.
  const ctx = await db.agentContext.findUnique({
    where: { userId: authUser.id },
    select: { strategistOutput: true },
  });
  if (!ctx?.strategistOutput) redirect("/onboarding");

  const { user, home, active } = await getDashUserAndHome();

  // Active Business is the canonical source of truth. The legacy
  // User.businessName/Logo fields are only used by the migration's
  // bootstrap fallback — once business.list runs, `active` is set and
  // we read from there. Email username is the last-ditch fallback for
  // accounts that somehow have no Business yet.
  const businessName =
    active?.name?.trim() ||
    user.businessName?.trim() ||
    user.email?.split("@")[0] ||
    "your business";
  const businessLogoUrl =
    active?.logoUrl ?? user.businessLogoUrl ?? null;
  const userName = user.email?.split("@")[0] ?? "you";

  return (
    <AppShell
      business={{
        name: businessName,
        initials: initialsFrom(businessName),
        logoUrl: businessLogoUrl,
      }}
      user={{
        name: userName,
        planLabel: "trial plan",
      }}
      navBadges={home.navBadges}
    >
      {children}
    </AppShell>
  );
}
