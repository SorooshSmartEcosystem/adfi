import { z } from "zod";
import { Provider } from "@orb/db";
import { router, authedProc } from "../trpc";
import { OrbError } from "../errors";
import { decryptToken, encryptToken } from "../services/crypto";
import {
  getMe as getTelegramBotIdentity,
  getChat as getTelegramChat,
  setWebhook as setTelegramWebhook,
  deleteWebhook as deleteTelegramWebhook,
  buildWebhookUrl as buildTelegramWebhookUrl,
} from "../services/telegram";

// Calls Meta's permission-revoke endpoint so disconnecting on adfi also
// revokes the authorization on the user's facebook account. Best-effort —
// if it fails (token expired, etc.) we still soft-disconnect locally so the
// app stops using it; the user can manually revoke at facebook.com/settings.
async function revokeMetaPermissions(token: string): Promise<void> {
  try {
    const url = new URL("https://graph.facebook.com/v19.0/me/permissions");
    url.searchParams.set("access_token", token);
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok) {
      console.warn("meta revoke failed:", res.status, await res.text());
    }
  } catch (err) {
    console.warn("meta revoke threw:", err);
  }
}

function publicBaseUrl(): string {
  const v =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL;
  if (!v) {
    throw new Error(
      "no public base url — set NEXT_PUBLIC_SITE_URL for telegram webhooks",
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
      where: { userId: ctx.user.id, disconnectedAt: null },
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
      const accounts = await ctx.db.connectedAccount.findMany({
        where: {
          userId: ctx.user.id,
          provider: input.provider,
          disconnectedAt: null,
        },
      });

      // Provider-specific external revocation. Best-effort — we always soft
      // disconnect locally even if the upstream call fails, so the app
      // stops using the connection.
      const seen = new Set<string>();
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

        if (
          input.provider === Provider.FACEBOOK ||
          input.provider === Provider.INSTAGRAM
        ) {
          await revokeMetaPermissions(token);
        } else if (input.provider === Provider.TELEGRAM) {
          await deleteTelegramWebhook(token);
        }
      }

      // Soft-disconnect locally — keeps the row so admin financials can
      // still attribute past activity, but stops the app from using it.
      await ctx.db.connectedAccount.updateMany({
        where: { userId: ctx.user.id, provider: input.provider },
        data: { disconnectedAt: new Date() },
      });
      return { ok: true as const };
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
});
