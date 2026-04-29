"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
          ✓ pointed at{" "}
          {maskWebhookSecret(
            refresh.data.registeredUrl ?? refresh.data.webhookUrl,
          )}
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
  const utils = trpc.useUtils();
  const q = trpc.connections.diagnoseTelegram.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const dismiss = trpc.insights.acknowledgeFinding.useMutation({
    onSuccess: () => utils.connections.diagnoseTelegram.invalidate(),
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
              {d.webhook.registeredUrl
                ? maskWebhookSecret(d.webhook.registeredUrl)
                : "(none registered)"}
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
        <DiagSection label="open findings (newest first)">
          <div className="flex flex-col gap-sm">
            {d.recentFindings.map((f) => {
              const payload = (f.payload ?? {}) as { error?: string };
              return (
                <div
                  key={f.id}
                  className="text-[11px] text-ink2 break-words"
                >
                  <div className="flex items-baseline gap-sm flex-wrap">
                    <span className="text-ink4 shrink-0">
                      {formatRelative(f.createdAt)}
                    </span>
                    <span className="flex-1 min-w-0">{f.summary}</span>
                    <button
                      type="button"
                      onClick={() => dismiss.mutate({ id: f.id })}
                      disabled={dismiss.isPending}
                      className="text-[11px] text-ink4 hover:text-ink shrink-0"
                    >
                      dismiss
                    </button>
                  </div>
                  {payload.error ? (
                    <div className="text-urgent font-mono mt-[2px] whitespace-pre-wrap break-all">
                      {String(payload.error).slice(0, 400)}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="text-[11px] text-ink4 mt-md leading-relaxed">
            tip: dismissing a finding marks it resolved. if the timestamp
            above predates your latest deploy, the underlying bug is
            already fixed — dismiss it and send a fresh dm to verify.
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

// Replace the webhook secret in a registered telegram URL with a redacted
// preview. The URL contains `<botId>.<webhookSecret>` and the secret is the
// long random string we set in env — we never want to render it in the DOM
// (screenshots, screen-shares, browser dev tools history, etc. would
// otherwise leak it).
function maskWebhookSecret(url: string): string {
  return url.replace(
    /(\/telegram\/\d+)\.([A-Za-z0-9_-]+)/,
    (_match, path: string, secret: string) => {
      const masked =
        secret.length > 12
          ? `${secret.slice(0, 4)}…${secret.slice(-4)}`
          : "•••";
      return `${path}.${masked}`;
    },
  );
}

function formatRelative(at: Date | string): string {
  const t = typeof at === "string" ? new Date(at).getTime() : at.getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
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
    <>
      <MetaConnectFlash />
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
    </>
  );
}

// Reads the `?connect=...` query param the meta oauth callback sets and
// surfaces an actionable banner. ok_fb_only is the most important branch:
// the user "succeeded" at OAuth but their IG isn't linked to the FB Page,
// so without this UI they'd just see "Instagram — not connected" and
// wonder what they did wrong.
const FLASH: Record<
  string,
  { kind: "ok" | "warn" | "err"; title: string; body: string; steps?: string[] }
> = {
  ok: {
    kind: "ok",
    title: "facebook page + instagram connected",
    body: "echo can post for you and signal will reply to dms.",
  },
  ok_fb_only: {
    kind: "warn",
    title: "facebook page connected — but instagram isn't linked",
    body: "your instagram needs to be linked to this facebook page in meta business suite. fix that, then disconnect + reconnect here.",
    steps: [
      "open business.facebook.com → settings → accounts → instagram accounts",
      "click 'add' → log in to your instagram → choose the facebook page you just connected",
      "come back here, tap 'disconnect' on facebook page, then 'connect instagram' again",
    ],
  },
  error_unauthenticated: {
    kind: "err",
    title: "you weren't signed in when meta redirected back",
    body: "sign in again, then re-open the connect flow.",
  },
  error_denied: {
    kind: "err",
    title: "you cancelled meta's authorization",
    body: "no harm done — tap connect again when you're ready.",
  },
  error_invalid: {
    kind: "err",
    title: "meta didn't return a valid code",
    body: "try again. if it keeps failing, the meta app may need re-approval.",
  },
  error_state: {
    kind: "err",
    title: "session mismatch — try again from this device",
    body: "this can happen if you opened the connect link on a different device or your cookies expired mid-flow.",
  },
  error_no_pages: {
    kind: "err",
    title: "your facebook account doesn't manage any pages",
    body: "create a facebook page first, then come back. instagram requires a page to publish.",
  },
  error_exchange: {
    kind: "err",
    title: "meta rejected the connection",
    body: "usually a permissions issue. make sure you're an admin of the page and instagram is set to a business or creator profile.",
  },
};

function MetaConnectFlash() {
  const params = useSearchParams();
  const router = useRouter();
  const code = params.get("connect");
  const flash = code ? FLASH[code] : null;

  // Strip the query param so a refresh doesn't re-show the banner.
  useEffect(() => {
    if (!code) return;
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      next.delete("connect");
      const qs = next.toString();
      router.replace(qs ? `?${qs}#channels` : "#channels", { scroll: false });
    }, 50);
    return () => clearTimeout(t);
  }, [code, params, router]);

  if (!flash) return null;
  const tone =
    flash.kind === "ok"
      ? "border-alive bg-alive/20 text-aliveDark"
      : flash.kind === "warn"
        ? "border-attentionBorder bg-attentionBg text-attentionText"
        : "border-urgent bg-urgent/10 text-urgent";

  return (
    <div
      className={`mb-md rounded-md border-hairline ${tone} px-md py-md`}
      role="status"
    >
      <div className="text-sm font-medium" dir="auto">{flash.title}</div>
      <p className="text-xs mt-xs leading-relaxed text-ink2" dir="auto">
        {flash.body}
      </p>
      {flash.steps ? (
        <ol className="mt-md flex flex-col gap-xs">
          {flash.steps.map((s, i) => (
            <li key={i} className="text-xs text-ink2 leading-relaxed flex gap-sm">
              <span className="text-ink4 tabular-nums shrink-0">{i + 1}.</span>
              <span dir="auto">{s}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
