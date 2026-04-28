"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../lib/trpc";
import { Card } from "../shared/card";
import { StatusDot } from "../shared/status-dot";

const PLATFORM_LABEL: Record<string, string> = {
  META: "meta",
  GOOGLE: "google",
  YOUTUBE: "youtube",
  TIKTOK: "tiktok",
};

function fmtMoney(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

// Renders draft review when status === AWAITING_REVIEW; running metrics
// when ACTIVE; and a final-report shape when ENDED.
export function CampaignDetail({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [activePlatform, setActivePlatform] = useState<string | null>(null);

  const q = trpc.campaigns.get.useQuery({ id: campaignId });
  const approve = trpc.campaigns.approveAndLaunch.useMutation({
    onSuccess: () => utils.campaigns.get.invalidate({ id: campaignId }),
  });
  const reject = trpc.campaigns.reject.useMutation({
    onSuccess: () => router.push("/campaigns"),
  });
  const pause = trpc.campaigns.pause.useMutation({
    onSuccess: () => utils.campaigns.get.invalidate({ id: campaignId }),
  });

  if (q.isLoading) return <p className="text-sm text-ink3">one second</p>;
  if (!q.data) return null;

  const c = q.data;
  const sched = (c.schedule ?? {}) as { totalBudgetCents?: number; startDate?: string; endDate?: string };
  const audience = (c.audience ?? {}) as {
    rationale?: string;
    locations?: string[];
    ageMin?: number;
    ageMax?: number;
    interests?: string[];
  };
  const reasoning = (c.reasoning ?? {}) as {
    summary?: string;
    perPlatform?: Record<string, { rationale?: string; budgetCents?: number }>;
  };

  // Group ads by platform
  const platforms = Array.from(new Set(c.ads.map((a) => a.platform)));
  const visiblePlatform = activePlatform || platforms[0] || null;
  const visibleAds = c.ads.filter((a) => a.platform === visiblePlatform);
  const platformBudget =
    visiblePlatform && reasoning.perPlatform?.[visiblePlatform]?.budgetCents;

  const isAwaitingReview = c.status === "AWAITING_REVIEW";
  const isApproved = !!c.approvedAt;

  return (
    <div className="flex flex-col gap-lg">
      <Card>
        <div className="flex items-baseline justify-between flex-wrap gap-sm mb-sm">
          <h2 className="text-xl font-medium tracking-tight">{c.name}</h2>
          <span className="text-xs text-ink4 font-mono">
            {fmtMoney(sched.totalBudgetCents ?? 0)} ·{" "}
            {c.platforms.length > 0 ? c.platforms.map((p) => PLATFORM_LABEL[p]).join(" · ") : "no platforms"}
          </span>
        </div>
        {reasoning.summary ? (
          <p className="text-sm text-ink2 leading-relaxed">
            {reasoning.summary}
          </p>
        ) : null}
        {isApproved ? (
          <div className="mt-md p-md bg-attentionBg rounded-md text-xs text-attentionText">
            ✓ approved · platform push lands in phase 2 (next week). drafts
            are saved and ready to launch the moment we wire meta + google.
          </div>
        ) : null}
      </Card>

      {/* Audience */}
      <Card>
        <div className="text-xs text-ink4 mb-sm">audience</div>
        <p className="text-sm text-ink2 leading-relaxed mb-sm">
          {audience.rationale}
        </p>
        <div className="flex flex-wrap gap-sm text-xs">
          {audience.locations?.length ? (
            <span className="bg-bg border-hairline border-border rounded-full px-md py-[5px]">
              {audience.locations.join(" · ")}
            </span>
          ) : null}
          <span className="bg-bg border-hairline border-border rounded-full px-md py-[5px]">
            {audience.ageMin ?? "?"}–{audience.ageMax ?? "?"}
          </span>
          {audience.interests?.slice(0, 5).map((i) => (
            <span key={i} className="bg-bg border-hairline border-border rounded-full px-md py-[5px]">
              {i}
            </span>
          ))}
        </div>
      </Card>

      {/* Per-platform tabs + ads */}
      {platforms.length > 0 ? (
        <Card>
          <div className="flex items-center gap-sm mb-md flex-wrap">
            {platforms.map((p) => {
              const active = visiblePlatform === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setActivePlatform(p)}
                  className={`text-xs px-md py-[6px] rounded-full border-hairline transition-colors ${
                    active
                      ? "bg-ink text-white border-ink"
                      : "border-border text-ink2 hover:border-ink"
                  }`}
                >
                  {PLATFORM_LABEL[p]}
                </button>
              );
            })}
            {platformBudget ? (
              <span className="ml-auto text-[11px] text-ink4 font-mono">
                {fmtMoney(platformBudget)} on this platform
              </span>
            ) : null}
          </div>

          {visibleAds.length === 0 ? (
            <p className="text-sm text-ink3">no creative variants yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
              {visibleAds.map((ad) => {
                const cr = (ad.creative ?? {}) as Record<string, unknown>;
                return (
                  <div
                    key={ad.id}
                    className="bg-white border-hairline border-border rounded-[14px] overflow-hidden"
                  >
                    {ad.format === "IMAGE" && cr.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={String(cr.imageUrl)}
                        alt=""
                        className="w-full aspect-[4/5] object-cover bg-bg"
                      />
                    ) : ad.format === "IMAGE" ? (
                      <div className="w-full aspect-[4/5] bg-bg flex items-center justify-center text-xs text-ink4 font-mono">
                        drawing image…
                      </div>
                    ) : null}
                    <div className="p-md">
                      <div className="text-[10px] font-mono uppercase tracking-[0.1em] text-ink4 mb-xs">
                        {ad.angle}
                      </div>
                      {ad.format === "IMAGE" ? (
                        <>
                          <div className="text-sm font-medium leading-snug mb-xs">
                            {String(cr.headline ?? "")}
                          </div>
                          <div className="text-sm text-ink2 leading-relaxed line-clamp-3">
                            {String(cr.body ?? "")}
                          </div>
                        </>
                      ) : ad.format === "VIDEO_SCRIPT" ? (
                        <>
                          <div className="text-sm font-medium leading-snug mb-xs">
                            {String(cr.hook ?? "")}
                          </div>
                          {Array.isArray(cr.shotList) ? (
                            <ul className="text-xs text-ink3 space-y-[2px]">
                              {(cr.shotList as string[]).slice(0, 4).map((s, i) => (
                                <li key={i}>· {s}</li>
                              ))}
                            </ul>
                          ) : null}
                        </>
                      ) : ad.format === "TEXT" ? (
                        <>
                          {Array.isArray(cr.headlines) ? (
                            <div className="text-sm font-medium mb-xs">
                              {(cr.headlines as string[]).slice(0, 2).join(" · ")}
                            </div>
                          ) : null}
                          {Array.isArray(cr.descriptions) ? (
                            <div className="text-xs text-ink3 line-clamp-2">
                              {(cr.descriptions as string[])[0]}
                            </div>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      ) : null}

      {/* Action footer */}
      {isAwaitingReview && !isApproved ? (
        <div className="flex items-center gap-sm flex-wrap">
          <button
            type="button"
            onClick={() => approve.mutate({ id: campaignId })}
            disabled={approve.isPending}
            className="bg-ink text-white text-md font-medium px-[28px] py-[13px] rounded-full disabled:opacity-40 hover:opacity-85 transition-opacity"
          >
            {approve.isPending ? "approving…" : "approve all & launch →"}
          </button>
          <button
            type="button"
            onClick={() => reject.mutate({ id: campaignId })}
            disabled={reject.isPending}
            className="text-sm text-ink2 border-hairline border-border rounded-full px-md py-[10px] hover:border-ink hover:text-ink transition-colors disabled:opacity-40"
          >
            reject
          </button>
        </div>
      ) : null}

      {c.status === "ACTIVE" ? (
        <button
          type="button"
          onClick={() => pause.mutate({ id: campaignId })}
          disabled={pause.isPending}
          className="self-start text-sm text-ink2 border-hairline border-border rounded-full px-md py-[10px] hover:border-ink hover:text-ink transition-colors disabled:opacity-40"
        >
          {pause.isPending ? "pausing…" : "pause campaign"}
        </button>
      ) : null}
    </div>
  );
}
