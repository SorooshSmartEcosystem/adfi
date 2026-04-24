import { createServerClient } from "@orb/auth/server";
import { LandingNav } from "../components/landing/nav";
import { Hero } from "../components/landing/hero";
import { WhatSection } from "../components/landing/what-section";
import { HowSection } from "../components/landing/how-section";
import { TeamSection } from "../components/landing/team-section";
import { PricingSection } from "../components/landing/pricing-section";
import { FaqSection } from "../components/landing/faq-section";
import { HireMeCta } from "../components/landing/hire-me-cta";
import { LandingFooter } from "../components/landing/footer";

export default async function Home() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const initial = user?.email?.charAt(0).toUpperCase() ?? "M";

  return (
    <main className="min-h-screen bg-bg">
      <LandingNav
        isAuthed={Boolean(user)}
        userInitial={initial}
        userLabel={user?.email ?? null}
      />
      <Hero />
      <WhatSection />
      <HowSection />
      <TeamSection />
      <PricingSection />
      <FaqSection />
      <HireMeCta />
      <LandingFooter />
    </main>
  );
}
