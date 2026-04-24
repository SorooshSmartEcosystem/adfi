import type { ReactNode } from "react";
import { OnboardingProgress } from "./onboarding-progress";

export function OnboardingShell({
  step,
  wide = false,
  children,
}: {
  step: number;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-lg py-2xl">
      <div
        className={`w-full ${wide ? "max-w-[560px]" : "max-w-[440px]"} bg-white border-hairline border-border rounded-2xl p-xl`}
      >
        <OnboardingProgress step={step} />
        {children}
      </div>
    </main>
  );
}

export function OnboardingHeading({
  title,
  sub,
}: {
  title: string;
  sub: string | ReactNode;
}) {
  return (
    <div className="mb-lg">
      <h2 className="text-2xl font-medium tracking-tight mb-sm">{title}</h2>
      <p className="text-sm text-ink3">{sub}</p>
    </div>
  );
}
