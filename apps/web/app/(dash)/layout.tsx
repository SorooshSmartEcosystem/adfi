import { redirect } from "next/navigation";
import { getCurrentUser } from "@orb/auth/server";
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
  // Reads identity from the header middleware attached after
  // validating the session — no second Auth round-trip per navigation.
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/signin");

  // Pull user + active business in one shot. getDashUserAndHome is
  // request-cached so calling it again from the page handler is free.
  const { user, home, active } = await getDashUserAndHome();

  // Onboarding gate — bounce when the user has no business yet, OR
  // when the active business has no brand voice yet. AgentContext is
  // per-Business now (was per-User), so each business needs its own
  // strategist run before agents can do anything meaningful for it.
  if (!active) redirect("/onboarding");
  const ctx = await db.agentContext.findUnique({
    where: { businessId: active.id },
    select: { strategistOutput: true },
  });
  if (!ctx?.strategistOutput) {
    // Self-heal before bouncing: an existing user might have an
    // AgentContext attached to a different business of theirs (common
    // after the multi-business migration when currentBusinessId got
    // pointed at a fresh business with no Strategist run yet, or when
    // a manual prod fixup left state inconsistent). If they already
    // have brand voice elsewhere, attach a copy to the active business
    // so they keep moving — much better UX than bouncing them through
    // a full onboarding flow they already completed once.
    const fallback = await db.agentContext.findFirst({
      where: {
        userId: authUser.id,
        strategistOutput: { not: { equals: null } },
      },
      orderBy: { lastRefreshedAt: { sort: "desc", nulls: "last" } },
      select: {
        strategistOutput: true,
        voiceFingerprint: true,
      },
    });
    if (fallback?.strategistOutput) {
      await db.agentContext.upsert({
        where: { businessId: active.id },
        create: {
          userId: authUser.id,
          businessId: active.id,
          strategistOutput: fallback.strategistOutput ?? undefined,
          voiceFingerprint: fallback.voiceFingerprint ?? undefined,
        },
        update: {
          strategistOutput: fallback.strategistOutput ?? undefined,
          voiceFingerprint: fallback.voiceFingerprint ?? undefined,
        },
      });
    } else {
      // Genuinely new user — no voice anywhere. Full onboarding flow.
      redirect("/onboarding");
    }
  }

  // Active Business is the canonical source of truth. The legacy
  // User.businessName/Logo fields are ONLY used as a last-ditch
  // fallback when there's no active Business at all (very rare —
  // migration backfilled one for everyone). When `active` is set,
  // its fields are authoritative — including a missing logo, which
  // should render as initials, NOT as the user-level legacy logo
  // (which would be a different business's brand).
  const businessName = active
    ? active.name.trim() || "your business"
    : user.businessName?.trim() ||
      user.email?.split("@")[0] ||
      "your business";
  const businessLogoUrl = active
    ? active.logoUrl ?? null
    : user.businessLogoUrl ?? null;
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
