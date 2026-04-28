import type { Metadata } from "next";
import { Suspense } from "react";
import { WowClient } from "./wow-client";

export const metadata: Metadata = {
  title: "see what i'd post for you",
  description:
    "tell adfi what you do. we'll write your brand voice, draft monday's post, and design a hero photo — before you sign up.",
};

// Public route. Intentionally no auth check — this is the pre-trial preview
// that converts visitors into accounts. The actual preview generation runs
// through onboarding.previewDemo (publicProc).
export default function OnboardingWowPage() {
  return (
    <Suspense fallback={null}>
      <WowClient />
    </Suspense>
  );
}
