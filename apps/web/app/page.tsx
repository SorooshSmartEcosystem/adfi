import { createServerClient } from "@orb/auth/server";
import { db } from "@orb/db";
import { LandingV4, type LandingUser } from "../components/landing-v4/landing-v4";

// Public landing page — v4 prototype port. The body, CSS, and interactive
// script are inlined verbatim from /prototype/ADFI_Landing_v4.html so
// visual + animation fidelity stays 100% with the design source.
//
// When a session cookie is present, look up the business name + logo and
// render an authed-user pill next to "get the app" so returning users can
// jump back into the dashboard.
export default async function Home() {
  const supabase = await createServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  let user: LandingUser | null = null;
  if (authUser) {
    const row = await db.user.findUnique({
      where: { id: authUser.id },
      select: { businessName: true, businessDescription: true, businessLogoUrl: true, email: true },
    });
    if (row) {
      const fallback =
        row.businessDescription?.split(/[.\n]/)[0]?.slice(0, 30)?.trim() ||
        row.email?.split("@")[0] ||
        "you";
      user = {
        name: (row.businessName?.trim() || fallback).toLowerCase(),
        logoUrl: row.businessLogoUrl,
      };
    }
  }

  return <LandingV4 user={user} />;
}
