"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../../lib/trpc";
import {
  OnboardingShell,
  OnboardingHeading,
} from "../../../components/onboarding/onboarding-shell";
import { PrimaryButton } from "../../../components/onboarding/primary-button";

type GoalValue = "MORE_CUSTOMERS" | "MORE_REPEAT_BUYERS" | "MORE_VISIBILITY";

const OPTIONS: { value: GoalValue; title: string; desc: string }[] = [
  {
    value: "MORE_CUSTOMERS",
    title: "more customers",
    desc: "new people discovering you",
  },
  {
    value: "MORE_REPEAT_BUYERS",
    title: "more repeat buyers",
    desc: "existing customers coming back",
  },
  {
    value: "MORE_VISIBILITY",
    title: "more visibility",
    desc: "just grow the brand first",
  },
];

export function GoalForm({ initialGoal }: { initialGoal: GoalValue | null }) {
  const router = useRouter();
  const [choice, setChoice] = useState<GoalValue | null>(initialGoal);
  const mutation = trpc.onboarding.saveGoal.useMutation({
    onSuccess: () => router.push("/onboarding/analysis"),
  });

  function handleContinue() {
    if (!choice) return;
    mutation.mutate({ goal: choice });
  }

  return (
    <OnboardingShell step={2}>
      <OnboardingHeading
        title="what do you want more of?"
        sub="pick the one that matters most. this shapes what i prioritize each week."
      />

      <div className="flex flex-col gap-sm mb-lg">
        {OPTIONS.map((option) => {
          const isActive = choice === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setChoice(option.value)}
              disabled={mutation.isPending}
              className={`text-left px-md py-[14px] rounded-lg transition-all ${
                isActive
                  ? "border-[1.5px] border-ink bg-white"
                  : "border-hairline border-border bg-bg hover:bg-surface"
              }`}
            >
              <div className="text-base font-medium mb-[2px]">{option.title}</div>
              <div className="text-xs text-ink3">{option.desc}</div>
            </button>
          );
        })}
      </div>

      <PrimaryButton
        type="button"
        onClick={handleContinue}
        disabled={!choice || mutation.isPending}
      >
        {mutation.isPending ? "saving..." : "continue →"}
      </PrimaryButton>

      {mutation.error && (
        <p className="text-sm text-urgent font-mono mt-md" role="alert">
          {mutation.error.message}
        </p>
      )}
    </OnboardingShell>
  );
}
