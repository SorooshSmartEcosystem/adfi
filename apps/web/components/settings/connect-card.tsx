"use client";
import { useState } from "react";
import { Card } from "../shared/card";
import { trpc } from "../../lib/trpc";

type Step = { title: string; body: string };

// db Provider enum values we surface in the UI. "EMAIL"/"LINKEDIN" aren't
// in the db enum yet — those entries skip the connection-status lookup.
type DbProvider = "INSTAGRAM" | "FACEBOOK";

type Provider = {
  code: string;
  name: string;
  blurb: string;
  steps: Step[];
  // 'live' / 'soon' / 'manual' — manual = the steps tell you exactly what to do
  // outside the app while we ship the OAuth.
  status: "live" | "soon" | "manual";
  // when set, the connect button below the steps becomes a real link to
  // this OAuth start route; otherwise it stays disabled with a helper note.
  connectHref?: string;
  // when set, ConnectionsList looks up trpc.connections.list for a row with
  // this provider value to show 'connected' state + a disconnect button.
  dbProvider?: DbProvider;
};

const PROVIDERS: Provider[] = [
  {
    code: "IG",
    name: "Instagram",
    status: "manual",
    connectHref: "/api/auth/meta/start",
    dbProvider: "INSTAGRAM",
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
        body: "we'll open meta's authorization flow. grant adfi the instagram + page-messaging permissions. echo will start drafting and i'll handle messenger / dm replies.",
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
    status: "manual",
    connectHref: "/api/auth/meta/start",
    dbProvider: "FACEBOOK",
    blurb: "post + messenger replies + marketplace ad placement.",
    steps: [
      {
        title: "make sure you're an admin of the Page",
        body: "in facebook → your page → settings → page roles. you need 'admin' for adfi to post and reply on your behalf.",
      },
      {
        title: "click the connect button below",
        body: "we'll open meta's authorization flow. grant adfi access to the page (post + read engagement), messenger (page messaging), and ads (so we can run marketplace-placement ads when you turn that on).",
      },
    ],
  },
  {
    code: "TT",
    name: "TikTok",
    status: "soon",
    blurb: "short-form scripts; tiktok publishing api added in q3.",
    steps: [],
  },
];

export function ConnectCard({
  provider,
  connected,
  onDisconnect,
}: {
  provider: Provider;
  connected?: boolean;
  onDisconnect?: () => void;
}) {
  const [open, setOpen] = useState(false);

  const statusChip = connected ? (
    <span className="text-[11px] text-aliveDark bg-alive/30 px-md py-[3px] rounded-full">
      connected
    </span>
  ) : provider.status === "live" ? (
    <span className="text-[11px] text-aliveDark bg-alive/30 px-md py-[3px] rounded-full">
      live
    </span>
  ) : provider.status === "manual" ? (
    <span className="text-[11px] text-attentionText bg-attentionBg border-hairline border-attentionBorder px-md py-[3px] rounded-full">
      setup steps
    </span>
  ) : (
    <span className="text-[11px] text-ink5">soon</span>
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
          <div className="w-7 h-7 rounded-md bg-surface flex items-center justify-center text-sm font-medium shrink-0">
            {provider.code}
          </div>
          <div className="min-w-0">
            <div className="text-md font-medium">{provider.name}</div>
            <div className="text-xs text-ink4 truncate">
              {provider.blurb}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-sm shrink-0">
          {statusChip}
          {provider.steps.length > 0 ? (
            <span className="text-md text-ink4">{open ? "−" : "+"}</span>
          ) : null}
        </div>
      </button>

      {open && provider.steps.length > 0 ? (
        <div className="mt-md pt-md border-t-hairline border-border2">
          <ol className="flex flex-col gap-md">
            {provider.steps.map((s, i) => (
              <li key={i} className="flex gap-md">
                <span className="text-xs text-ink4 mt-[2px] shrink-0 w-[24px] tabular-nums">
                  {i + 1}.
                </span>
                <div className="flex-1">
                  <div className="text-sm font-medium mb-xs">{s.title}</div>
                  <p className="text-sm text-ink3 leading-relaxed">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          {provider.status === "manual" ? (
            <div className="flex items-center gap-sm mt-lg pt-md border-t-hairline border-border2 flex-wrap">
              {connected ? (
                <>
                  <span className="text-xs text-aliveDark">
                    ✓ connected
                  </span>
                  {onDisconnect ? (
                    <button
                      type="button"
                      onClick={onDisconnect}
                      className="text-xs text-ink2 border-hairline border-border rounded-full px-md py-[5px] hover:border-urgent hover:text-urgent transition-colors"
                    >
                      disconnect
                    </button>
                  ) : null}
                </>
              ) : provider.connectHref ? (
                <a
                  href={provider.connectHref}
                  className="bg-ink text-white text-xs font-medium px-md py-[7px] rounded-full hover:opacity-85 transition-opacity"
                >
                  connect {provider.name.toLowerCase()} →
                </a>
              ) : (
                <>
                  <button
                    type="button"
                    disabled
                    className="bg-ink text-white text-xs font-medium px-md py-[7px] rounded-full disabled:opacity-40"
                  >
                    connect {provider.name.toLowerCase()} →
                  </button>
                  <span className="text-[11px] text-ink4">
                    button activates once oauth ships
                  </span>
                </>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ConnectionsList() {
  const utils = trpc.useUtils();
  const connections = trpc.connections.list.useQuery();
  const disconnect = trpc.connections.disconnect.useMutation({
    onSuccess: () => utils.connections.list.invalidate(),
  });

  const connectedSet = new Set(
    (connections.data ?? []).map((c) => c.provider as string),
  );

  return (
    <Card padded={false}>
      {PROVIDERS.map((p, i) => {
        const isConnected = p.dbProvider
          ? connectedSet.has(p.dbProvider)
          : false;
        return (
          <div
            key={p.code}
            className={
              i < PROVIDERS.length - 1 ? "hairline-b2 border-border2" : ""
            }
          >
            <ConnectCard
              provider={p}
              connected={isConnected}
              onDisconnect={
                isConnected && p.dbProvider
                  ? () =>
                      disconnect.mutate({
                        provider: p.dbProvider as "INSTAGRAM" | "FACEBOOK",
                      })
                  : undefined
              }
            />
          </div>
        );
      })}
    </Card>
  );
}
