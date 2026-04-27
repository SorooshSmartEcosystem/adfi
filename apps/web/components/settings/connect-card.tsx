"use client";
import { useState } from "react";
import { Card } from "../shared/card";
import { trpc } from "../../lib/trpc";

type Step = { title: string; body: string };

// db Provider enum values we surface in the UI. "EMAIL"/"LINKEDIN" aren't
// in the db enum yet — those entries skip the connection-status lookup.
type DbProvider =
  | "INSTAGRAM"
  | "FACEBOOK"
  | "TELEGRAM"
  | "TELEGRAM_CHANNEL";

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
  // optional inline form (no OAuth) — shown in place of the connect link
  customForm?: "telegram-bot" | "telegram-channel";
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
    code: "TG",
    name: "Telegram bot",
    status: "manual",
    customForm: "telegram-bot",
    dbProvider: "TELEGRAM",
    blurb: "answer dms in your voice, route bookings to you.",
    steps: [
      {
        title: "open @BotFather on telegram",
        body: "in telegram, search for @BotFather and start a chat. send /newbot, pick a name + handle. botfather replies with a token.",
      },
      {
        title: "paste the token below",
        body: "we'll validate it, register a webhook, and signal will start replying to dms in your voice the next time someone messages your bot.",
      },
    ],
  },
  {
    code: "TC",
    name: "Telegram channel",
    status: "manual",
    customForm: "telegram-channel",
    dbProvider: "TELEGRAM_CHANNEL",
    blurb: "publish posts to your channel via the bot.",
    steps: [
      {
        title: "connect your telegram bot first (above)",
        body: "channels publish through the bot — without a bot we can't post.",
      },
      {
        title: "add the bot as an admin of your channel",
        body: "open your telegram channel → administrators → add admin → search your bot's @username → grant 'post messages'.",
      },
      {
        title: "paste the channel @username below",
        body: "we'll resolve it to a chat id and store it. echo will be able to draft channel posts and you'll approve them in /content.",
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
            <div className="mt-lg pt-md border-t-hairline border-border2">
              {connected ? (
                <div className="flex items-center gap-sm flex-wrap">
                  <span className="text-xs text-aliveDark">✓ connected</span>
                  {provider.dbProvider === "TELEGRAM" ? (
                    <TelegramRefreshButton />
                  ) : null}
                  {onDisconnect ? (
                    <button
                      type="button"
                      onClick={onDisconnect}
                      className="text-xs text-ink2 border-hairline border-border rounded-full px-md py-[5px] hover:border-urgent hover:text-urgent transition-colors"
                    >
                      disconnect
                    </button>
                  ) : null}
                </div>
              ) : provider.customForm === "telegram-bot" ? (
                <TelegramBotForm />
              ) : provider.customForm === "telegram-channel" ? (
                <TelegramChannelForm />
              ) : provider.connectHref ? (
                <a
                  href={provider.connectHref}
                  className="bg-ink text-white text-xs font-medium px-md py-[7px] rounded-full hover:opacity-85 transition-opacity inline-block"
                >
                  connect {provider.name.toLowerCase()} →
                </a>
              ) : (
                <div className="flex items-center gap-sm flex-wrap">
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
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function TelegramRefreshButton() {
  const refresh = trpc.connections.refreshTelegramWebhook.useMutation();
  const [diagOpen, setDiagOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => refresh.mutate()}
        disabled={refresh.isPending}
        className="text-xs text-ink2 border-hairline border-border rounded-full px-md py-[5px] hover:border-ink hover:text-ink transition-colors disabled:opacity-40"
      >
        {refresh.isPending ? "refreshing..." : "refresh webhook"}
      </button>
      <button
        type="button"
        onClick={() => setDiagOpen((v) => !v)}
        className="text-xs text-ink2 border-hairline border-border rounded-full px-md py-[5px] hover:border-ink hover:text-ink transition-colors"
      >
        {diagOpen ? "hide diagnostics" : "diagnose"}
      </button>
      {refresh.data?.ok ? (
        <span className="text-[11px] text-aliveDark truncate max-w-[260px]">
          ✓ pointed at {refresh.data.registeredUrl ?? refresh.data.webhookUrl}
        </span>
      ) : null}
      {refresh.error ? (
        <span className="text-[11px] text-urgent">{refresh.error.message}</span>
      ) : null}
      {diagOpen ? <TelegramDiagnostics /> : null}
    </>
  );
}

function TelegramDiagnostics() {
  const q = trpc.connections.diagnoseTelegram.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  if (q.isLoading) {
    return <div className="basis-full text-[11px] text-ink4 mt-sm">one second</div>;
  }
  if (!q.data) {
    return (
      <div className="basis-full text-[11px] text-ink4 mt-sm">
        couldn&apos;t load diagnostics — check vercel logs
      </div>
    );
  }
  const d = q.data;
  return (
    <div className="basis-full w-full max-w-full mt-md flex flex-col gap-md text-xs bg-surface rounded-md p-md overflow-hidden">
      <DiagSection label="webhook">
        {d.webhook ? (
          <>
            <div className="font-mono text-[11px] break-all">
              {d.webhook.registeredUrl || "(none registered)"}
            </div>
            <div className="text-[11px] text-ink4 mt-xs">
              pending updates: {d.webhook.pendingUpdateCount}
            </div>
            {d.webhook.lastErrorMessage ? (
              <div className="text-[11px] text-urgent mt-xs break-words">
                last error: {d.webhook.lastErrorMessage}
              </div>
            ) : null}
          </>
        ) : (
          <div className="text-[11px] text-ink4">no bot connected</div>
        )}
      </DiagSection>

      <DiagSection label="last 5 telegram messages">
        {d.recentMessages.length === 0 ? (
          <div className="text-[11px] text-ink4">
            none yet — send your bot a dm to test
          </div>
        ) : (
          <div className="flex flex-col gap-xs">
            {d.recentMessages.map((m, i) => (
              <div
                key={i}
                className="text-[11px] text-ink2 break-words"
              >
                <span className="text-ink4">
                  {m.direction === "INBOUND" ? "← them" : "→ me"}
                  {m.handledBy ? ` (${m.handledBy})` : ""}
                </span>{" "}
                {m.body.slice(0, 80)}
                {m.body.length > 80 ? "…" : ""}
              </div>
            ))}
          </div>
        )}
      </DiagSection>

      <DiagSection label="last 5 signal events">
        {d.recentEvents.length === 0 ? (
          <div className="text-[11px] text-ink4">none</div>
        ) : (
          <div className="flex flex-col gap-xs">
            {d.recentEvents.map((e, i) => (
              <div key={i} className="font-mono text-[11px] text-ink2">
                {e.eventType}
              </div>
            ))}
          </div>
        )}
      </DiagSection>

      {d.recentFindings.length > 0 ? (
        <DiagSection label="recent findings">
          <div className="flex flex-col gap-sm">
            {d.recentFindings.map((f, i) => {
              const payload = (f.payload ?? {}) as { error?: string };
              return (
                <div
                  key={i}
                  className="text-[11px] text-ink2 break-words"
                >
                  <div>{f.summary}</div>
                  {payload.error ? (
                    <div className="text-urgent font-mono mt-[2px] whitespace-pre-wrap break-all">
                      {String(payload.error).slice(0, 400)}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </DiagSection>
      ) : null}
    </div>
  );
}

function DiagSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-ink4 mb-xs">{label}</div>
      {children}
    </div>
  );
}

function TelegramBotForm() {
  const utils = trpc.useUtils();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const connect = trpc.connections.connectTelegramBot.useMutation({
    onSuccess: (r) => {
      setSuccess(`connected — bot @${r.botUsername} is live`);
      setError(null);
      setToken("");
      utils.connections.list.invalidate();
    },
    onError: (e) => {
      setError(e.message);
      setSuccess(null);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!token.trim()) return;
        connect.mutate({ token: token.trim() });
      }}
      className="flex flex-col gap-sm"
    >
      <input
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="paste botfather token"
        autoComplete="off"
        spellCheck={false}
        className="px-md py-[8px] border-hairline border-border rounded-full text-sm focus:outline-none focus:border-ink"
        disabled={connect.isPending}
      />
      <div className="flex items-center gap-sm flex-wrap">
        <button
          type="submit"
          disabled={connect.isPending || !token.trim()}
          className="bg-ink text-white text-xs font-medium px-md py-[7px] rounded-full disabled:opacity-40"
        >
          {connect.isPending ? "validating..." : "connect bot →"}
        </button>
        {error ? (
          <span className="text-[11px] text-urgent">{error}</span>
        ) : success ? (
          <span className="text-[11px] text-aliveDark">{success}</span>
        ) : null}
      </div>
    </form>
  );
}

function TelegramChannelForm() {
  const utils = trpc.useUtils();
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const connect = trpc.connections.connectTelegramChannel.useMutation({
    onSuccess: (r) => {
      setSuccess(
        `connected — ${r.title ?? r.channelHandle} ready for posting`,
      );
      setError(null);
      setHandle("");
      utils.connections.list.invalidate();
    },
    onError: (e) => {
      setError(e.message);
      setSuccess(null);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!handle.trim()) return;
        connect.mutate({ channelHandle: handle.trim() });
      }}
      className="flex flex-col gap-sm"
    >
      <input
        type="text"
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
        placeholder="@yourchannel"
        autoComplete="off"
        spellCheck={false}
        className="px-md py-[8px] border-hairline border-border rounded-full text-sm focus:outline-none focus:border-ink"
        disabled={connect.isPending}
      />
      <div className="flex items-center gap-sm flex-wrap">
        <button
          type="submit"
          disabled={connect.isPending || !handle.trim()}
          className="bg-ink text-white text-xs font-medium px-md py-[7px] rounded-full disabled:opacity-40"
        >
          {connect.isPending ? "resolving..." : "connect channel →"}
        </button>
        {error ? (
          <span className="text-[11px] text-urgent">{error}</span>
        ) : success ? (
          <span className="text-[11px] text-aliveDark">{success}</span>
        ) : null}
      </div>
    </form>
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
                        provider: p.dbProvider as DbProvider,
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
