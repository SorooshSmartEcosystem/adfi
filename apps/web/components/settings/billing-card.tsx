"use client";
import { Card } from "../shared/card";
import { trpc } from "../../lib/trpc";

const PLAN_LABEL: Record<string, string> = {
  SOLO: "starter · monthly",
  TEAM: "team · monthly",
  STUDIO: "studio · monthly",
};

const PLAN_PRICE: Record<string, string> = {
  SOLO: "$39/mo",
  TEAM: "$99/mo",
  STUDIO: "$299/mo",
};

export function BillingCard() {
  const subQuery = trpc.billing.getCurrent.useQuery();
  const usageQuery = trpc.billing.getUsage.useQuery();
  const portal = trpc.billing.createPortalSession.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  if (subQuery.isLoading) {
    return (
      <Card>
        <div className="text-sm text-ink3">one second</div>
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
            <div className="text-xs text-ink4 mt-xs">
              start a trial to put a plan on file.
            </div>
          </div>
        </div>
        <a
          href="/onboarding/plan"
          className="inline-block text-xs text-ink2 border-hairline border-border rounded-full px-md py-[5px] hover:border-ink hover:text-ink transition-colors"
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
          <div className="text-xs text-ink4 mt-xs">
            {isTrialing
              ? `trial · ends ${sub.currentPeriodEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toLowerCase()}`
              : PLAN_PRICE[sub.plan] ?? "$99/mo"}
          </div>
          {sub.cancelAtPeriodEnd ? (
            <div className="text-xs text-attentionText mt-xs">
              cancels{" "}
              {sub.currentPeriodEnd
                .toLocaleDateString("en-US", { month: "short", day: "numeric" })
                .toLowerCase()}
            </div>
          ) : null}
        </div>
        <span
          className={`text-[11px] px-md py-[3px] rounded-full ${
            sub.status === "ACTIVE" || sub.status === "TRIALING"
              ? "bg-alive text-[#1a4a2c]"
              : sub.status === "PAST_DUE"
                ? "bg-attentionBg text-attentionText"
                : "bg-surface text-ink3"
          }`}
        >
          {sub.status.toLowerCase()}
        </span>
      </div>

      {usageQuery.data ? (
        <div className="mb-md pt-md border-t-hairline border-border2">
          <div className="flex items-center justify-between mb-xs">
            <span className="text-xs text-ink4">
              usage · {usageQuery.data.period}
            </span>
            <span className="text-xs tabular-nums">
              {usageQuery.data.creditsUsed} / {usageQuery.data.creditsLimit}{" "}
              <span
                className={
                  usageQuery.data.exhausted
                    ? "text-urgent"
                    : usageQuery.data.pctUsed >= 80
                      ? "text-attentionText"
                      : "text-ink4"
                }
              >
                · {usageQuery.data.pctUsed}%
              </span>
            </span>
          </div>
          <div className="h-[6px] bg-border2 rounded-sm overflow-hidden">
            <div
              className={`h-full transition-[width] ${
                usageQuery.data.exhausted
                  ? "bg-urgent"
                  : usageQuery.data.pctUsed >= 80
                    ? "bg-attentionBorder"
                    : "bg-ink"
              }`}
              style={{ width: `${usageQuery.data.pctUsed}%` }}
            />
          </div>
          <div className="text-[11px] text-ink4 mt-xs">
            resets{" "}
            {new Date(usageQuery.data.resetsAt)
              .toLocaleDateString("en-US", { month: "short", day: "numeric" })
              .toLowerCase()}
            {usageQuery.data.exhausted ? " · upgrade for more" : ""}
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-md flex-wrap">
        <button
          type="button"
          onClick={() => portal.mutate()}
          disabled={portal.isPending}
          className="text-xs text-ink2 border-hairline border-border rounded-full px-md py-[5px] hover:border-ink hover:text-ink transition-colors disabled:opacity-40"
        >
          {portal.isPending ? "opening..." : "manage billing"}
        </button>
        <button
          type="button"
          onClick={() => portal.mutate()}
          disabled={portal.isPending}
          className="text-xs text-ink2 border-hairline border-border rounded-full px-md py-[5px] hover:border-ink hover:text-ink transition-colors disabled:opacity-40"
        >
          update card
        </button>
        <button
          type="button"
          onClick={() => portal.mutate()}
          disabled={portal.isPending}
          className="text-xs text-ink2 border-hairline border-border rounded-full px-md py-[5px] hover:border-ink hover:text-ink transition-colors disabled:opacity-40"
        >
          {sub.cancelAtPeriodEnd ? "resume plan" : "cancel"}
        </button>
      </div>

      {portal.error ? (
        <p className="text-xs text-urgent mt-md" role="alert">
          {portal.error.message}
        </p>
      ) : null}
    </Card>
  );
}
