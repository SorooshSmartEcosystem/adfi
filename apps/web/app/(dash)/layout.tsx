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

  const { user, home } = await getDashUserAndHome();

  const businessName =
    user.businessDescription?.split(/[.\n]/)[0]?.slice(0, 30)?.trim() ||
    (user.email?.split("@")[0] ?? "your business");
  const userName = user.email?.split("@")[0] ?? "you";

  return (
    <AppShell
      business={{
        name: businessName,
        initials: initialsFrom(businessName),
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
