import { redirect } from "next/navigation";
import { createServerClient } from "@orb/auth/server";
import { LandingNav } from "../components/landing/nav";
import { Hero } from "../components/landing/hero";
import { WhatSection } from "../components/landing/what-section";
import { HowSection } from "../components/landing/how-section";
import { PricingSection } from "../components/landing/pricing-section";
import { FaqSection } from "../components/landing/faq-section";
import { LandingFooter } from "../components/landing/footer";

export default async function Home() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-bg">
      <LandingNav />
      <Hero />
      <WhatSection />
      <HowSection />
      <PricingSection />
      <FaqSection />
      <LandingFooter />
    </main>
  );
}
