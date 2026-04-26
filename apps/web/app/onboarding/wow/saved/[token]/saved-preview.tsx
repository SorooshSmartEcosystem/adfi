"use client";

import Link from "next/link";
import type { OnboardingPreviewResult } from "@orb/api";

export function SavedPreview({
  businessDescription,
  result,
}: {
  businessDescription: string;
  result: OnboardingPreviewResult;
}) {
  return (
    <section>
      <div className="mb-[40px]">
        <div className="inline-flex items-center gap-sm text-aliveDark text-xs mb-md">
          <span className="w-[7px] h-[7px] rounded-full bg-alive animate-pulse" />
          welcome back
        </div>
        <h1
          className="font-medium tracking-tight leading-[1.1] mb-sm"
          style={{ fontSize: "clamp(28px, 4vw, 36px)", letterSpacing: "-0.025em" }}
        >
          here&apos;s the post i wrote for you.
        </h1>
        <p className="text-md text-ink3">“{businessDescription}”</p>
      </div>

      <div className="grid grid-cols-1 gap-[32px] lg:grid-cols-[minmax(360px,480px)_1fr] lg:gap-[56px] items-start">
        <div>
          <PostPreview result={result} />
        </div>

        <div className="min-w-0">
          <h2
            className="font-medium tracking-tight leading-[1.1] mb-md"
            style={{ fontSize: "clamp(22px, 3vw, 28px)" }}
          >
            ready to put me to work?
          </h2>
          <p className="text-md text-ink3 leading-[1.6] mb-lg">
            14 days free. i&apos;ll do this every weekday — plus answer your
            dms, catch your missed calls, and watch what works.
          </p>
          <div className="bg-surface2 rounded-[12px] p-md text-xs text-ink2 leading-[1.6] mb-lg">
            <strong className="font-medium text-ink">tuesday</strong> — a
            behind-the-scenes from{" "}
            {result.voice.pillars[0] ?? "your work"}.
            <br />
            <strong className="font-medium text-ink">wednesday</strong> — a
            customer story.
            <br />
            <strong className="font-medium text-ink">thursday</strong> —
            newsletter with last week&apos;s drop.
          </div>
          <div className="flex flex-wrap gap-md items-center sm:flex-col sm:items-stretch">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-sm px-xl py-md bg-ink text-white rounded-full text-sm font-medium whitespace-nowrap hover:opacity-85 transition-opacity"
            >
              start free 14-day trial
            </Link>
            <Link
              href="/onboarding/wow"
              className="inline-flex items-center justify-center gap-sm px-lg py-[13px] border-hairline border-border bg-white rounded-full text-xs text-ink2 whitespace-nowrap hover:border-ink hover:text-ink transition-colors"
            >
              try a different one
            </Link>
          </div>
          <div className="text-xs text-ink4 mt-md">
            no card required. cancel anytime.
          </div>
        </div>
      </div>
    </section>
  );
}

function PostPreview({ result }: { result: OnboardingPreviewResult }) {
  return (
    <div className="bg-white border-hairline border-border rounded-[16px] overflow-hidden max-w-full">
      <div className="flex items-center gap-md px-lg py-md border-b-hairline border-border2">
        <div className="w-7 h-7 rounded-full bg-surface flex items-center justify-center text-xs font-medium shrink-0">
          ◐
        </div>
        <div className="text-xs font-medium">your business</div>
        <div className="ml-auto text-[11px] text-ink4">instagram</div>
      </div>
      {result.imageUrl ? (
        <img
          src={result.imageUrl}
          alt=""
          className="w-full aspect-[4/5] object-cover bg-surface"
        />
      ) : (
        <div
          className="w-full aspect-[4/5]"
          style={{
            background:
              "linear-gradient(135deg, #d4a574 0%, #b07c4f 50%, #8a5a35 100%)",
          }}
        />
      )}
      <div className="px-lg pt-md pb-lg">
        <div className="text-sm font-medium leading-[1.4] mb-sm">
          {result.post.hook}
        </div>
        <div className="text-xs text-ink2 leading-[1.55] whitespace-pre-wrap mb-md">
          {result.post.body}
        </div>
        {result.post.cta ? (
          <div className="text-xs text-ink leading-[1.4] mb-sm font-medium">
            {result.post.cta}
          </div>
        ) : null}
        <div className="text-xs text-ink4">
          {result.post.hashtags.slice(0, 6).join(" ")}
        </div>
      </div>
    </div>
  );
}
