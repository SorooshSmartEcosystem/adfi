"use client";
import { useState } from "react";
import { Card } from "../shared/card";

type Step = { title: string; body: string };

type Provider = {
  code: string;
  name: string;
  blurb: string;
  steps: Step[];
  // 'live' / 'soon' / 'manual' — manual = the steps tell you exactly what to do
  // outside the app while we ship the OAuth.
  status: "live" | "soon" | "manual";
};

const PROVIDERS: Provider[] = [
  {
    code: "IG",
    name: "Instagram",
    status: "manual",
    blurb: "post for you, dm replies, story sequences.",
    steps: [
      {
        title: "switch your account to a Business or Creator profile",
        body: "in instagram → menu → settings and privacy → account type and tools → switch to professional → choose 'business' (recommended) or 'creator'. takes 30 seconds.",
      },
      {
        title: "link your instagram to a Facebook Page",
        body: "the meta graph api requires a Page. in instagram → settings → business tools and controls → link to facebook account → pick (or create) a Page. it doesn't have to be active.",
      },
      {
        title: "click the connect button below",
        body: "we'll open meta's authorization flow. grant adfi the instagram_basic + instagram_content_publish permissions. that's it — echo will start drafting.",
      },
    ],
  },
  {
    code: "LI",
    name: "LinkedIn",
    status: "manual",
    blurb: "long-form posts, b2b lead gen, weekly thought-leadership cadence.",
    steps: [
      {
        title: "make sure you have a personal Profile (not a Page)",
        body: "for now we publish from your personal Profile — Pages are coming. any LinkedIn account works.",
      },
      {
        title: "click connect below",
        body: "linkedin will ask you to authorize adfi for w_member_social (write posts) and r_liteprofile (read your name/avatar). nothing else.",
      },
    ],
  },
  {
    code: "EM",
    name: "Email newsletter",
    status: "live",
    blurb: "send to your subscriber list via sendgrid. already set up for you.",
    steps: [
      {
        title: "add subscribers",
        body: "in settings → newsletter list — paste a CSV or add emails one at a time. unsubscribes are handled automatically.",
      },
      {
        title: "approve an email draft",
        body: "in /content?tab=drafts pick the email format → echo writes a subject + body → approve it.",
      },
      {
        title: "tap 'send newsletter'",
        body: "the approved draft sends to every active subscriber. you'll see open/click rates in the performance tab once they roll in.",
      },
    ],
  },
  {
    code: "FB",
    name: "Facebook Page",
    status: "soon",
    blurb: "ships once instagram OAuth lands — same pipe, different surface.",
    steps: [],
  },
  {
    code: "TT",
    name: "TikTok",
    status: "soon",
    blurb: "short-form scripts; tiktok publishing api added in q3.",
    steps: [],
  },
];

export function ConnectCard({ provider }: { provider: Provider }) {
  const [open, setOpen] = useState(false);

  const statusChip =
    provider.status === "live" ? (
      <span className="font-mono text-[10px] text-aliveDark bg-alive/30 px-md py-[3px] rounded-full tracking-[0.15em]">
        LIVE
      </span>
    ) : provider.status === "manual" ? (
      <span className="font-mono text-[10px] text-attentionText bg-attentionBg border-hairline border-attentionBorder px-md py-[3px] rounded-full tracking-[0.15em]">
        SETUP STEPS
      </span>
    ) : (
      <span className="font-mono text-[10px] text-ink5 tracking-[0.15em]">
        SOON
      </span>
    );

  return (
    <div
      className={`px-lg py-md ${
        provider.status === "soon" ? "opacity-70" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => provider.steps.length > 0 && setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left"
        disabled={provider.steps.length === 0}
      >
        <div className="flex items-center gap-md min-w-0">
          <div className="w-7 h-7 rounded-md bg-surface flex items-center justify-center font-mono text-sm font-medium shrink-0">
            {provider.code}
          </div>
          <div className="min-w-0">
            <div className="text-md font-medium">{provider.name}</div>
            <div className="font-mono text-sm text-ink4 truncate">
              {provider.blurb}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-sm shrink-0">
          {statusChip}
          {provider.steps.length > 0 ? (
            <span className="font-mono text-sm text-ink4">{open ? "−" : "+"}</span>
          ) : null}
        </div>
      </button>

      {open && provider.steps.length > 0 ? (
        <div className="mt-md pt-md border-t-hairline border-border2">
          <ol className="flex flex-col gap-md">
            {provider.steps.map((s, i) => (
              <li key={i} className="flex gap-md">
                <span className="font-mono text-xs text-ink4 tracking-[0.15em] mt-[2px] shrink-0 w-[24px]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1">
                  <div className="text-sm font-medium mb-xs">{s.title}</div>
                  <p className="text-sm text-ink3 leading-relaxed">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          {provider.status === "manual" ? (
            <div className="flex items-center gap-sm mt-lg pt-md border-t-hairline border-border2">
              <button
                type="button"
                disabled
                className="bg-ink text-white font-mono text-xs px-md py-[7px] rounded-full disabled:opacity-40"
                title="OAuth flow coming soon"
              >
                connect {provider.name.toLowerCase()} →
              </button>
              <span className="font-mono text-[10px] text-ink4">
                button activates once meta/linkedin oauth ships
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ConnectionsList() {
  return (
    <Card padded={false}>
      {PROVIDERS.map((p, i) => (
        <div
          key={p.code}
          className={i < PROVIDERS.length - 1 ? "hairline-b2 border-border2" : ""}
        >
          <ConnectCard provider={p} />
        </div>
      ))}
    </Card>
  );
}
