"use client";
import { Card } from "../shared/card";
import { trpc } from "../../lib/trpc";

const PLAN_LABEL: Record<string, string> = {
  SOLO: "starter · monthly",
  TEAM: "team · monthly",
  STUDIO: "studio · monthly",
};

const PLAN_PRICE: Record<string, string> = {
  SOLO: "$39/MO",
  TEAM: "$99/MO",
  STUDIO: "$299/MO",
};

export function BillingCard() {
  const subQuery = trpc.billing.getCurrent.useQuery();
  const portal = trpc.billing.createPortalSession.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  if (subQuery.isLoading) {
    return (
      <Card>
        <div className="text-sm text-ink3 font-mono">one second</div>
      </Card>
    );
  }

  const sub = subQuery.data;

  if (!sub) {
    return (
      <Card>
        <div className="flex items-start justify-between mb-md">
          <div>
            <div className="text-lg font-medium">no active plan</div>
            <div className="font-mono text-sm text-ink4 mt-xs">
              start a trial to put a plan on file.
            </div>
          </div>
        </div>
        <a
          href="/onboarding/plan"
          className="inline-block font-mono text-xs text-ink2 border-hairline border-border rounded-full px-md py-[5px] hover:border-ink hover:text-ink transition-colors"
        >
          start trial →
        </a>
      </Card>
    );
  }

  const isTrialing = sub.status === "TRIALING";

  return (
    <Card>
      <div className="flex items-start justify-between mb-md">
        <div>
          <div className="text-lg font-medium">
            {PLAN_LABEL[sub.plan] ?? "team · monthly"}
          </div>
          <div className="font-mono text-sm text-ink4 mt-xs">
            {isTrialing
              ? `TRIAL · ENDS ${sub.currentPeriodEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()}`
              : PLAN_PRICE[sub.plan] ?? "$99/MO"}
          </div>
          {sub.cancelAtPeriodEnd ? (
            <div className="font-mono text-xs text-attentionText mt-xs">
              CANCELS{" "}
              {sub.currentPeriodEnd
                .toLocaleDateString("en-US", { month: "short", day: "numeric" })
                .toUpperCase()}
            </div>
          ) : null}
        </div>
        <span
          className={`font-mono text-[10px] px-md py-[3px] rounded-full tracking-[0.1em] ${
            sub.status === "ACTIVE" || sub.status === "TRIALING"
              ? "bg-alive text-[#1a4a2c]"
              : sub.status === "PAST_DUE"
                ? "bg-attentionBg text-attentionText"
                : "bg-surface text-ink3"
          }`}
        >
          {sub.status}
        </span>
      </div>

      <div className="flex items-center gap-md flex-wrap">
        <button
          type="button"
          onClick={() => portal.mutate()}
          disabled={portal.isPending}
          className="font-mono text-xs text-ink2 border-hairline border-border rounded-full px-md py-[5px] hover:border-ink hover:text-ink transition-colors disabled:opacity-40"
        >
          {portal.isPending ? "opening..." : "manage billing"}
        </button>
        <button
          type="button"
          onClick={() => portal.mutate()}
          disabled={portal.isPending}
          className="font-mono text-xs text-ink2 border-hairline border-border rounded-full px-md py-[5px] hover:border-ink hover:text-ink transition-colors disabled:opacity-40"
        >
          update card
        </button>
        <button
          type="button"
          onClick={() => portal.mutate()}
          disabled={portal.isPending}
          className="font-mono text-xs text-ink2 border-hairline border-border rounded-full px-md py-[5px] hover:border-ink hover:text-ink transition-colors disabled:opacity-40"
        >
          {sub.cancelAtPeriodEnd ? "resume plan" : "cancel"}
        </button>
      </div>

      {portal.error ? (
        <p className="text-sm text-urgent font-mono mt-md" role="alert">
          {portal.error.message}
        </p>
      ) : null}
    </Card>
  );
}
