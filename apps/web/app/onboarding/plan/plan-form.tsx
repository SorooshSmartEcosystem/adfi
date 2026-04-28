"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  OnboardingShell,
  OnboardingHeading,
} from "../../../components/onboarding/onboarding-shell";
import { PrimaryButton } from "../../../components/onboarding/primary-button";
import { trpc } from "../../../lib/trpc";

type PlanId = "SOLO" | "TEAM" | "STUDIO" | "AGENCY";

const PLANS: {
  id: PlanId;
  name: string;
  price: number;
  tagline: string;
  recommended?: boolean;
}[] = [
  { id: "SOLO", name: "solo", price: 29, tagline: "get your hours back" },
  {
    id: "TEAM",
    name: "team",
    price: 79,
    tagline: "never miss a customer",
    recommended: true,
  },
  { id: "STUDIO", name: "studio", price: 199, tagline: "run multiple brands" },
  { id: "AGENCY", name: "agency", price: 499, tagline: "white-label for clients" },
];

export function PlanForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // 'from' param tells us where the user came from so we can route back
  // there after Stripe completes. Default 'onboarding' for first-time
  // signups arriving here through the standard flow.
  const fromParam = searchParams?.get("from");
  const from: "onboarding" | "settings" | "campaigns" =
    fromParam === "settings" ? "settings"
      : fromParam === "campaigns" ? "campaigns"
      : "onboarding";

  // Detect existing subscription. Drives:
  //   - which plan is the "current plan" (badge + disabled selection)
  //   - whether we call createCheckout (no sub) or changePlan (existing
  //     sub) on submit — avoids double-charging upgraders.
  const subQuery = trpc.billing.getCurrent.useQuery();
  const existingSub = subQuery.data;
  const currentPlan = existingSub?.plan as PlanId | undefined;

  const [selected, setSelected] = useState<PlanId>("TEAM");

  // Default to a sensible non-current selection: pick the next tier up
  // when the user already has a plan, otherwise TEAM (recommended).
  useEffect(() => {
    if (!currentPlan) return;
    const order: PlanId[] = ["SOLO", "TEAM", "STUDIO", "AGENCY"];
    const idx = order.indexOf(currentPlan);
    const next = idx >= 0 && idx < order.length - 1 ? order[idx + 1]! : "TEAM";
    if (next !== currentPlan) setSelected(next);
  }, [currentPlan]);

  const checkout = trpc.billing.createCheckout.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });
  const utils = trpc.useUtils();
  const changePlan = trpc.billing.changePlan.useMutation({
    onSuccess: () => {
      utils.billing.getCurrent.invalidate();
      utils.billing.getUsage.invalidate();
      // Land back where they came from instead of looping through
      // onboarding.
      const target =
        from === "campaigns" ? "/campaigns"
          : from === "settings" ? "/settings#billing"
          : "/dashboard";
      router.push(target);
    },
  });

  const submit = () => {
    if (existingSub) {
      // Already has a paid sub — use changePlan (proration) instead of
      // creating a fresh subscription that would double-charge.
      if (currentPlan === selected) return; // shouldn't happen — button disabled
      changePlan.mutate({ plan: selected });
    } else {
      checkout.mutate({ plan: selected, from });
    }
  };

  const isPending = checkout.isPending || changePlan.isPending;
  const isSameAsCurrent = currentPlan === selected;
  const submitLabel = existingSub
    ? isSameAsCurrent
      ? `you're on ${selected.toLowerCase()}`
      : changePlan.isPending
        ? "switching..."
        : `switch to ${selected.toLowerCase()} →`
    : checkout.isPending
      ? "opening stripe..."
      : "start my 7 days free →";

  return (
    <OnboardingShell step={4}>
      <OnboardingHeading
        title={
          existingSub
            ? "change your plan."
            : "start my free trial."
        }
        sub={
          existingSub
            ? `you're currently on ${currentPlan?.toLowerCase()}. switching prorates the difference.`
            : "7 days free. pick what you want me to do. change anytime."
        }
      />

      <div className="flex flex-col gap-sm mb-lg">
        {PLANS.map((p) => {
          const sel = selected === p.id;
          const isCurrent = currentPlan === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => !isCurrent && setSelected(p.id)}
              disabled={isCurrent}
              className={`relative bg-white rounded-lg p-md text-left transition-all ${
                sel
                  ? "border-[1.5px] border-ink"
                  : "border-hairline border-border"
              } ${isCurrent ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {isCurrent ? (
                <div className="absolute -top-[8px] left-md bg-aliveDark text-white px-[8px] py-[2px] rounded-full font-mono text-[9px] tracking-[0.15em]">
                  CURRENT PLAN
                </div>
              ) : p.recommended ? (
                <div className="absolute -top-[8px] left-md bg-ink text-white px-[8px] py-[2px] rounded-full font-mono text-[9px] tracking-[0.15em]">
                  MOST POPULAR
                </div>
              ) : null}
              <div
                className={`flex justify-between items-baseline ${p.recommended || isCurrent ? "mt-[3px]" : ""}`}
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

      {!existingSub ? (
        <div className="bg-surface rounded-md p-sm mb-lg">
          <p className="text-[11px] text-ink3 leading-[1.55]">
            <strong className="text-ink">you won&apos;t be charged today.</strong>{" "}
            i&apos;ll take you to stripe to put a card on file. 7 days free,
            cancel any time.
          </p>
        </div>
      ) : (
        <div className="bg-surface rounded-md p-sm mb-lg">
          <p className="text-[11px] text-ink3 leading-[1.55]">
            <strong className="text-ink">prorated.</strong>{" "}
            stripe charges or credits the difference between your current
            plan and the new one based on days remaining in this billing
            period. no second invoice; no double-charge.
          </p>
        </div>
      )}

      <PrimaryButton
        type="button"
        onClick={submit}
        disabled={isPending || isSameAsCurrent}
      >
        {submitLabel}
      </PrimaryButton>

      <p className="font-mono text-[10px] text-ink5 text-center mt-md">
        🔒 stripe · cancel anytime
      </p>

      {(checkout.error || changePlan.error) ? (
        <p
          className="text-sm text-urgent font-mono mt-md text-center"
          role="alert"
        >
          {checkout.error?.message ?? changePlan.error?.message}
        </p>
      ) : null}
    </OnboardingShell>
  );
}
