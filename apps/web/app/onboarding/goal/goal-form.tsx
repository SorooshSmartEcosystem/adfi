"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../../lib/trpc";

type GoalValue = "MORE_CUSTOMERS" | "MORE_REPEAT_BUYERS" | "MORE_VISIBILITY";

const OPTIONS: { value: GoalValue; label: string; hint: string }[] = [
  {
    value: "MORE_CUSTOMERS",
    label: "more new customers",
    hint: "people who haven't heard of me yet",
  },
  {
    value: "MORE_REPEAT_BUYERS",
    label: "more repeat buyers",
    hint: "my existing customers buying again",
  },
  {
    value: "MORE_VISIBILITY",
    label: "more visibility",
    hint: "being known in my space",
  },
];

export function GoalForm({ initialGoal }: { initialGoal: GoalValue | null }) {
  const router = useRouter();
  const [choice, setChoice] = useState<GoalValue | null>(initialGoal);
  const mutation = trpc.onboarding.saveGoal.useMutation({
    onSuccess: () => router.push("/onboarding/analysis"),
  });

  function handleSelect(value: GoalValue) {
    setChoice(value);
    mutation.mutate({ goal: value });
  }

  return (
    <div className="flex flex-col gap-md w-full max-w-md">
      <div className="flex items-center gap-md mb-lg">
        <span
          className="inline-block w-sm h-sm rounded-full bg-alive"
          aria-hidden
        />
        <h1 className="text-2xl font-medium tracking-tight">ADFI</h1>
      </div>

      <p className="text-sm font-mono text-ink3 mb-md">what do you want more of?</p>

      <div className="flex flex-col gap-sm">
        {OPTIONS.map((option) => {
          const isActive = choice === option.value;
          const isPending = mutation.isPending && isActive;
          return (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              disabled={mutation.isPending}
              className={
                "flex flex-col items-start gap-xs px-md py-md rounded-md border text-left transition-colors disabled:opacity-50 " +
                (isActive
                  ? "border-ink bg-surface"
                  : "border-border bg-bg hover:bg-surface")
              }
            >
              <span className="text-md font-medium text-ink">
                {option.label}
                {isPending && " ..."}
              </span>
              <span className="text-xs font-mono text-ink3">{option.hint}</span>
            </button>
          );
        })}
      </div>

      {mutation.error && (
        <p className="text-sm text-urgent font-mono" role="alert">
          {mutation.error.message}
        </p>
      )}
    </div>
  );
}
