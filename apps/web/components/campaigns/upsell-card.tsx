import Link from "next/link";

// Plan-gated upsell shown when a SOLO/TEAM user lands on /campaigns.
// The /campaigns route is visible in the sidebar for everyone (per the
// "show with upsell beats hide-then-surprise" pattern); this card is
// what they see when they click it on a non-eligible plan.

export function CampaignsUpsellCard() {
  return (
    <div className="bg-white border-hairline border-border rounded-[20px] p-xl text-center max-w-[520px] mx-auto">
      <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-ink4 mb-md">
        STUDIO FEATURE
      </div>
      <h2 className="text-2xl font-medium tracking-tight mb-md">
        run paid ads, hands-off.
      </h2>
      <p className="text-sm text-ink3 leading-relaxed mb-xl">
        plan, run, and optimize paid campaigns across meta, google,
        youtube, and tiktok — all from one brief. one approval click,
        i handle the rest. starting at $199/mo on studio.
      </p>
      <Link
        href="/onboarding/plan?from=campaigns"
        className="inline-block bg-ink text-white py-[13px] px-[28px] rounded-full text-md font-medium hover:opacity-85 transition-opacity"
      >
        upgrade to studio →
      </Link>
      <p className="text-xs text-ink4 mt-md">
        2 campaigns/mo · $1,500 ad-spend cap · meta + google + youtube
      </p>
    </div>
  );
}
