import { z } from "zod";
import { Provider } from "@orb/db";
import { router, authedProc } from "../trpc";
import { OrbError } from "../errors";
import { decryptToken, encryptToken } from "../services/crypto";
import {
  getMe as getTelegramBotIdentity,
  getChat as getTelegramChat,
  getWebhookInfo as getTelegramWebhookInfo,
  setWebhook as setTelegramWebhook,
  deleteWebhook as deleteTelegramWebhook,
  buildWebhookUrl as buildTelegramWebhookUrl,
} from "../services/telegram";
import { listSubscribedApps, subscribePageWebhook } from "../services/meta";

// Calls Meta's permission-revoke endpoint so disconnecting on adfi also
// revokes the authorization on the user's facebook account. Best-effort —
// if it fails (token expired, etc.) we still soft-disconnect locally so the
// app stops using it; the user can manually revoke at facebook.com/settings.
//
// Important: this MUST be called with a USER access token, not a Page
// access token. Page tokens can only revoke per-page Page-app links, not
// the user-level app authorization that Meta surfaces under "Apps and
// Websites" in the user's account settings.
async function revokeMetaPermissions(userToken: string): Promise<boolean> {
  try {
    const url = new URL("https://graph.facebook.com/v19.0/me/permissions");
    url.searchParams.set("access_token", userToken);
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok) {
      console.warn("meta revoke failed:", res.status, await res.text());
      return false;
    }
    const body = (await res.json().catch(() => ({}))) as { success?: boolean };
    return body.success !== false;
  } catch (err) {
    console.warn("meta revoke threw:", err);
    return false;
  }
}

function publicBaseUrl(): string {
  // Project canonical name is NEXT_PUBLIC_WEB_URL — keep SITE_URL/APP_URL
  // as forward-compat aliases. VERCEL_URL is the deployment-specific URL
  // (e.g. adfi-abc123.vercel.app) so it is *not* safe for webhooks that
  // need to survive past the current deploy.
  const v =
    process.env.NEXT_PUBLIC_WEB_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL;
  if (!v) {
    throw new Error(
      "no public base url — set NEXT_PUBLIC_WEB_URL (e.g. https://www.adfi.ca) for telegram webhooks",
    );
  }
  return v.startsWith("http") ? v : `https://${v}`;
}

function telegramRouteSecret(): string {
  const v = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!v) {
    throw new Error(
      "TELEGRAM_WEBHOOK_SECRET must be set to register telegram webhooks",
    );
  }
  return v;
}

// Read + disconnect connected oauth accounts (Meta/IG/etc.). Tokens never
// leave the server — this router only exposes provider + display fields.
export const connectionsRouter = router({
  list: authedProc.input(z.void()).query(async ({ ctx }) => {
    const rows = await ctx.db.connectedAccount.findMany({
      where: {
        // Scope to active business; legacy rows (no businessId yet)
        // still surface for the user that owns them.
        OR: [
          { businessId: ctx.currentBusinessId, disconnectedAt: null },
          { businessId: null, userId: ctx.user.id, disconnectedAt: null },
        ],
      },
      select: {
        id: true,
        provider: true,
        externalId: true,
        scope: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
    return rows;
  }),

  disconnect: authedProc
    .input(z.object({ provider: z.nativeEnum(Provider) }))
    .mutation(async ({ ctx, input }) => {
      // Meta's app-level revoke is app-wide — once we revoke, both FB
      // Page and IG access die together. So when the user disconnects
      // either FB or IG we treat it as "disconnect Meta" and operate on
      // both providers' rows in lockstep. Otherwise the surviving row
      // would lie about being connected.
      const isMeta =
        input.provider === Provider.FACEBOOK ||
        input.provider === Provider.INSTAGRAM;
      const targetProviders: Provider[] = isMeta
        ? [Provider.FACEBOOK, Provider.INSTAGRAM]
        : [input.provider];

      const accounts = await ctx.db.connectedAccount.findMany({
        where: {
          userId: ctx.user.id,
          provider: { in: targetProviders },
          disconnectedAt: null,
        },
      });

      // For Meta, prefer the USER access token (stored in encryptedRefresh
      // by the oauth callback) over the page token. Only the user token
      // can hit DELETE /me/permissions to revoke the app authorization
      // at the user level — the page token revokes nothing visible to
      // the user in their Meta settings.
      let metaRevoked = false;
      const seen = new Set<string>();

      if (isMeta) {
        for (const a of accounts) {
          if (!a.encryptedRefresh) continue;
          const userToken = (() => {
            try {
              return decryptToken(a.encryptedRefresh);
            } catch {
              return null;
            }
          })();
          if (!userToken || seen.has(userToken)) continue;
          seen.add(userToken);
          metaRevoked = (await revokeMetaPermissions(userToken)) || metaRevoked;
          if (metaRevoked) break;
        }
        // Legacy fallback: rows created before encryptedRefresh was wired
        // up have no user token. Try the page token — it won't revoke at
        // the user level, but it's better than nothing for stopping any
        // page-app link.
        if (!metaRevoked) {
          for (const a of accounts) {
            const pageToken = (() => {
              try {
                return decryptToken(a.encryptedToken);
              } catch {
                return null;
              }
            })();
            if (!pageToken || seen.has(pageToken)) continue;
            seen.add(pageToken);
            await revokeMetaPermissions(pageToken);
          }
        }
      } else {
        for (const a of accounts) {
          const token = (() => {
            try {
              return decryptToken(a.encryptedToken);
            } catch {
              return null;
            }
          })();
          if (!token || seen.has(token)) continue;
          seen.add(token);
          if (input.provider === Provider.TELEGRAM) {
            await deleteTelegramWebhook(token);
          }
        }
      }

      // Soft-disconnect locally — keeps the row so admin financials can
      // still attribute past activity, but stops the app from using it.
      await ctx.db.connectedAccount.updateMany({
        where: { userId: ctx.user.id, provider: { in: targetProviders } },
        data: { disconnectedAt: new Date() },
      });
      return { ok: true as const, metaRevoked: isMeta ? metaRevoked : null };
    }),

  // Connect a Telegram bot by pasting the BotFather token. We validate via
  // getMe, register the webhook, and store the encrypted token keyed on the
  // bot's numeric id.
  connectTelegramBot: authedProc
    .input(z.object({ token: z.string().min(20).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const identity = await getTelegramBotIdentity(input.token).catch(
        (err) => {
          throw OrbError.EXTERNAL_API(
            `couldn't validate bot token: ${err instanceof Error ? err.message : String(err)}`,
          );
        },
      );

      const secret = telegramRouteSecret();
      const webhookUrl = buildTelegramWebhookUrl({
        publicBaseUrl: publicBaseUrl(),
        routeSecret: secret,
        botId: identity.id,
      });

      try {
        await setTelegramWebhook({
          token: input.token,
          url: webhookUrl,
          secretToken: secret,
        });
      } catch (err) {
        throw OrbError.EXTERNAL_API(
          `couldn't register telegram webhook: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      const encrypted = encryptToken(input.token);
      const externalId = String(identity.id);

      await ctx.db.connectedAccount.upsert({
        where: {
          userId_provider_externalId: {
            userId: ctx.user.id,
            provider: Provider.TELEGRAM,
            externalId,
          },
        },
        create: {
          userId: ctx.user.id,
          provider: Provider.TELEGRAM,
          externalId,
          encryptedToken: encrypted,
          scope: `bot:@${identity.username}`,
        },
        update: {
          encryptedToken: encrypted,
          disconnectedAt: null,
          scope: `bot:@${identity.username}`,
        },
      });

      return {
        ok: true as const,
        botUsername: identity.username,
        botName: identity.firstName,
      };
    }),

  // Re-register the webhook for an existing bot. Useful when the deployment
  // URL changed (NEXT_PUBLIC_WEB_URL was updated, rotated, or the bot was
  // first connected on a deploy that didn't have it set). Reads the stored
  // encrypted token and calls setWebhook with the current public base URL.
  refreshTelegramWebhook: authedProc
    .input(z.void())
    .mutation(async ({ ctx }) => {
      const bot = await ctx.db.connectedAccount.findFirst({
        where: {
          userId: ctx.user.id,
          provider: Provider.TELEGRAM,
          disconnectedAt: null,
        },
      });
      if (!bot) throw OrbError.VALIDATION("no telegram bot connected");
      const token = decryptToken(bot.encryptedToken);
      const secret = telegramRouteSecret();
      const webhookUrl = buildTelegramWebhookUrl({
        publicBaseUrl: publicBaseUrl(),
        routeSecret: secret,
        botId: bot.externalId,
      });
      try {
        await setTelegramWebhook({
          token,
          url: webhookUrl,
          secretToken: secret,
        });
      } catch (err) {
        throw OrbError.EXTERNAL_API(
          `couldn't refresh telegram webhook: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      const info = await getTelegramWebhookInfo(token).catch(() => null);
      return {
        ok: true as const,
        webhookUrl,
        registeredUrl: info?.url ?? null,
        pendingUpdateCount: info?.pendingUpdateCount ?? 0,
        lastErrorMessage: info?.lastErrorMessage ?? null,
      };
    }),

  // Read-only diagnostic — what URL has Telegram actually got registered
  // for our bot, when did it last error, etc.
  inspectTelegramWebhook: authedProc
    .input(z.void())
    .query(async ({ ctx }) => {
      const bot = await ctx.db.connectedAccount.findFirst({
        where: {
          userId: ctx.user.id,
          provider: Provider.TELEGRAM,
          disconnectedAt: null,
        },
      });
      if (!bot) return null;
      const token = decryptToken(bot.encryptedToken);
      const info = await getTelegramWebhookInfo(token).catch(() => null);
      if (!info) return null;
      return {
        registeredUrl: info.url,
        pendingUpdateCount: info.pendingUpdateCount,
        lastErrorMessage: info.lastErrorMessage,
        lastErrorDate: info.lastErrorDate,
      };
    }),

  // One-shot diagnostic — bundles webhook info, the last 5 inbound
  // telegram messages, the last 5 SIGNAL agent events, and any
  // SIGNAL-authored Findings. Lets the user see exactly where DMs are
  // landing without poking at the database.
  diagnoseTelegram: authedProc
    .input(z.void())
    .query(async ({ ctx }) => {
      const bot = await ctx.db.connectedAccount.findFirst({
        where: {
          userId: ctx.user.id,
          provider: Provider.TELEGRAM,
          disconnectedAt: null,
        },
        select: { externalId: true, scope: true, encryptedToken: true },
      });

      let webhook: {
        registeredUrl: string;
        pendingUpdateCount: number;
        lastErrorMessage: string | null;
        lastErrorDate: number | null;
      } | null = null;
      if (bot) {
        const token = decryptToken(bot.encryptedToken);
        const info = await getTelegramWebhookInfo(token).catch(() => null);
        if (info) {
          webhook = {
            registeredUrl: info.url,
            pendingUpdateCount: info.pendingUpdateCount,
            lastErrorMessage: info.lastErrorMessage,
            lastErrorDate: info.lastErrorDate,
          };
        }
      }

      const [recentMessages, recentEvents, recentFindings] =
        await Promise.all([
          ctx.db.message.findMany({
            where: {
              userId: ctx.user.id,
              channel: "TELEGRAM",
            },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
              direction: true,
              body: true,
              createdAt: true,
              handledBy: true,
            },
          }),
          ctx.db.agentEvent.findMany({
            where: {
              userId: ctx.user.id,
              agent: "SIGNAL",
            },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
              eventType: true,
              payload: true,
              createdAt: true,
            },
          }),
          ctx.db.finding.findMany({
            where: {
              userId: ctx.user.id,
              agent: "SIGNAL",
              acknowledged: false,
            },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
              id: true,
              summary: true,
              payload: true,
              createdAt: true,
              acknowledged: true,
            },
          }),
        ]);

      return {
        botUsername: bot?.scope ?? null,
        botId: bot?.externalId ?? null,
        webhook,
        recentMessages,
        recentEvents,
        recentFindings,
      };
    }),

  // Connect a channel by pasting its @username. The bot must already be
  // an admin of the channel (Telegram requires this for sendMessage to
  // succeed). We resolve to a chat_id via getChat and store it as a
  // separate ConnectedAccount row under TELEGRAM_CHANNEL.
  connectTelegramChannel: authedProc
    .input(
      z.object({
        channelHandle: z
          .string()
          .min(2)
          .max(64)
          .regex(/^@?[A-Za-z0-9_]+$/),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const bot = await ctx.db.connectedAccount.findFirst({
        where: {
          userId: ctx.user.id,
          provider: Provider.TELEGRAM,
          disconnectedAt: null,
        },
      });
      if (!bot) {
        throw OrbError.VALIDATION(
          "connect a telegram bot first — channels publish through the bot",
        );
      }
      const token = decryptToken(bot.encryptedToken);
      const handle = input.channelHandle.startsWith("@")
        ? input.channelHandle
        : `@${input.channelHandle}`;

      const chat = await getTelegramChat({ token, chatId: handle }).catch(
        (err) => {
          throw OrbError.EXTERNAL_API(
            `couldn't load channel — make sure the bot is added as admin: ${err instanceof Error ? err.message : String(err)}`,
          );
        },
      );

      // Reuse the bot token for channel posts (one bot, multiple channels).
      // The token is what authorizes sendMessage; chat_id selects the target.
      const externalId = String(chat.id);
      await ctx.db.connectedAccount.upsert({
        where: {
          userId_provider_externalId: {
            userId: ctx.user.id,
            provider: Provider.TELEGRAM_CHANNEL,
            externalId,
          },
        },
        create: {
          userId: ctx.user.id,
          provider: Provider.TELEGRAM_CHANNEL,
          externalId,
          encryptedToken: bot.encryptedToken,
          scope: handle,
        },
        update: {
          encryptedToken: bot.encryptedToken,
          disconnectedAt: null,
          scope: handle,
        },
      });

      return {
        ok: true as const,
        channelHandle: handle,
        title: chat.title,
      };
    }),

  // Re-run subscribePageWebhook against the existing FB Page connection
  // without touching OAuth. Useful for debugging delivery problems
  // when the page was subscribed but events aren't firing — lets us
  // re-subscribe with current scopes / log any precise error from Meta
  // without making the user disconnect + reconnect.
  rebindMetaWebhook: authedProc.input(z.void()).mutation(async ({ ctx }) => {
    const fbAccount = await ctx.db.connectedAccount.findFirst({
      where: {
        userId: ctx.user.id,
        provider: Provider.FACEBOOK,
        disconnectedAt: null,
      },
      select: { externalId: true, encryptedToken: true },
    });
    if (!fbAccount) {
      throw OrbError.NOT_FOUND("facebook connection");
    }
    const pageToken = decryptToken(fbAccount.encryptedToken);
    const results: Array<{
      field: string;
      ok: boolean;
      error: string | null;
    }> = [];
    for (const field of ["messages", "messaging_postbacks"] as const) {
      try {
        await subscribePageWebhook({
          pageId: fbAccount.externalId,
          pageAccessToken: pageToken,
          fields: [field],
        });
        results.push({ field, ok: true, error: null });
      } catch (err) {
        results.push({
          field,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return { results };
  }),

  // Read-side diagnostic for the Meta connection. Returns what Graph
  // says is subscribed at the page + ig levels, so we can tell whether
  // events should be flowing to /api/webhooks/meta. If subscribedApps
  // is empty, Meta has no path to deliver events even if the page is
  // connected — usually the App-level webhook config is missing or
  // points at the wrong URL.
  diagnoseMeta: authedProc.input(z.void()).query(async ({ ctx }) => {
    const accounts = await ctx.db.connectedAccount.findMany({
      where: {
        userId: ctx.user.id,
        provider: { in: [Provider.FACEBOOK, Provider.INSTAGRAM] },
        disconnectedAt: null,
      },
      select: {
        id: true,
        provider: true,
        externalId: true,
        scope: true,
        encryptedToken: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const expectedCallback =
      (process.env.NEXT_PUBLIC_WEB_URL ??
        `https://${process.env.VERCEL_URL ?? "www.adfi.ca"}`) +
      "/api/webhooks/meta";

    const rows = await Promise.all(
      accounts.map(async (a) => {
        let token: string | null = null;
        try {
          token = decryptToken(a.encryptedToken);
        } catch {
          token = null;
        }
        if (!token) {
          return {
            provider: a.provider,
            externalId: a.externalId,
            scope: a.scope,
            error: "could not decrypt token",
            subscribedApps: [],
          };
        }
        try {
          const subs = await listSubscribedApps({
            pageId: a.externalId,
            pageAccessToken: token,
          });
          return {
            provider: a.provider,
            externalId: a.externalId,
            scope: a.scope,
            error: null,
            subscribedApps: subs,
          };
        } catch (err) {
          return {
            provider: a.provider,
            externalId: a.externalId,
            scope: a.scope,
            error: err instanceof Error ? err.message : String(err),
            subscribedApps: [],
          };
        }
      }),
    );

    return { rows, expectedCallback };
  }),
});
