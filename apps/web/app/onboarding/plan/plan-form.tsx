"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  OnboardingShell,
  OnboardingHeading,
} from "../../../components/onboarding/onboarding-shell";
import { PrimaryButton } from "../../../components/onboarding/primary-button";

type PlanId = "starter" | "team" | "studio";

const PLANS: {
  id: PlanId;
  name: string;
  price: number;
  tagline: string;
  recommended?: boolean;
}[] = [
  { id: "starter", name: "starter", price: 39, tagline: "the essentials" },
  {
    id: "team",
    name: "team",
    price: 99,
    tagline: "most solopreneurs pick this",
    recommended: true,
  },
  { id: "studio", name: "studio", price: 299, tagline: "a full marketing team" },
];

export function PlanForm() {
  const router = useRouter();
  const [selected, setSelected] = useState<PlanId>("team");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // Card capture goes through Stripe later — for now, trial starts on continue.
    setTimeout(() => router.push("/onboarding/phone"), 400);
  }

  return (
    <OnboardingShell step={4}>
      <form onSubmit={handleSubmit}>
        <OnboardingHeading
          title="start my free trial."
          sub="7 days free. pick what you want me to do. change this anytime."
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
                <div className={`flex justify-between items-baseline ${p.recommended ? "mt-[3px]" : ""}`}>
                  <div className="flex items-center gap-sm">
                    <span
                      className={`w-[14px] h-[14px] rounded-full transition-all ${
                        sel ? "border-[4px] border-ink" : "border-[1.5px] border-ink5"
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

        <p className="font-mono text-[10px] text-ink4 tracking-[0.2em] mb-[6px]">
          CARD ON FILE
        </p>
        <div className="bg-white border-hairline border-border rounded-md mb-md overflow-hidden">
          <div className="px-md py-[12px] flex items-center gap-sm">
            <div className="w-[32px] h-[20px] bg-surface rounded-[4px] flex items-center justify-center font-mono text-[9px] text-ink3">
              CARD
            </div>
            <input
              type="text"
              placeholder="card number"
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>
          <div className="flex hairline-top border-border2">
            <div className="flex-1 px-md py-[12px] border-r-hairline border-border2">
              <input
                type="text"
                placeholder="mm / yy"
                className="w-full bg-transparent outline-none text-sm"
              />
            </div>
            <div className="flex-1 px-md py-[12px]">
              <input
                type="text"
                placeholder="cvc"
                className="w-full bg-transparent outline-none text-sm"
              />
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-md p-sm mb-lg">
          <p className="text-[11px] text-ink3 leading-[1.55]">
            <strong className="text-ink">you won't be charged today.</strong>{" "}
            your card will only be used after i've shown real results.
          </p>
        </div>

        <PrimaryButton type="submit" disabled={submitting}>
          {submitting ? "saving..." : "start my 7 days free →"}
        </PrimaryButton>
        <p className="font-mono text-[10px] text-ink5 text-center mt-md">
          🔒 stripe · cancel anytime
        </p>
      </form>
    </OnboardingShell>
  );
}
