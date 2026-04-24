"use client";
import { useState } from "react";
import {
  OnboardingShell,
  OnboardingHeading,
} from "../../../components/onboarding/onboarding-shell";
import { PrimaryButton } from "../../../components/onboarding/primary-button";
import { trpc } from "../../../lib/trpc";

type PlanId = "SOLO" | "TEAM" | "STUDIO";

const PLANS: {
  id: PlanId;
  name: string;
  price: number;
  tagline: string;
  recommended?: boolean;
}[] = [
  { id: "SOLO", name: "starter", price: 39, tagline: "the essentials" },
  {
    id: "TEAM",
    name: "team",
    price: 99,
    tagline: "most solopreneurs pick this",
    recommended: true,
  },
  { id: "STUDIO", name: "studio", price: 299, tagline: "a full marketing team" },
];

export function PlanForm() {
  const [selected, setSelected] = useState<PlanId>("TEAM");
  const checkout = trpc.billing.createCheckout.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  return (
    <OnboardingShell step={4}>
      <OnboardingHeading
        title="start my free trial."
        sub="7 days free. pick what you want me to do. change anytime."
      />

      <div className="flex flex-col gap-sm mb-lg">
        {PLANS.map((p) => {
          const sel = selected === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              className={`relative bg-white rounded-lg p-md text-left transition-all ${
                sel
                  ? "border-[1.5px] border-ink"
                  : "border-hairline border-border"
              }`}
            >
              {p.recommended ? (
                <div className="absolute -top-[8px] left-md bg-ink text-white px-[8px] py-[2px] rounded-full font-mono text-[9px] tracking-[0.15em]">
                  MOST POPULAR
                </div>
              ) : null}
              <div
                className={`flex justify-between items-baseline ${p.recommended ? "mt-[3px]" : ""}`}
              >
                <div className="flex items-center gap-sm">
                  <span
                    className={`w-[14px] h-[14px] rounded-full transition-all ${
                      sel
                        ? "border-[4px] border-ink"
                        : "border-[1.5px] border-ink5"
                    }`}
                  />
                  <span className="text-base font-medium">{p.name}</span>
                </div>
                <span className="text-base">
                  <span className="font-medium">${p.price}</span>
                  <span className="text-xs text-ink4">/mo</span>
                </span>
              </div>
              <div className="font-mono text-[10px] text-ink4 mt-[4px] pl-[22px] tracking-[0.1em]">
                {p.tagline}
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-surface rounded-md p-sm mb-lg">
        <p className="text-[11px] text-ink3 leading-[1.55]">
          <strong className="text-ink">you won&apos;t be charged today.</strong>{" "}
          i&apos;ll take you to stripe to put a card on file. 7 days free,
          cancel any time.
        </p>
      </div>

      <PrimaryButton
        type="button"
        onClick={() => checkout.mutate({ plan: selected })}
        disabled={checkout.isPending}
      >
        {checkout.isPending ? "opening stripe..." : "start my 7 days free →"}
      </PrimaryButton>

      <p className="font-mono text-[10px] text-ink5 text-center mt-md">
        🔒 stripe · cancel anytime
      </p>

      {checkout.error ? (
        <p
          className="text-sm text-urgent font-mono mt-md text-center"
          role="alert"
        >
          {checkout.error.message}
        </p>
      ) : null}
    </OnboardingShell>
  );
}
