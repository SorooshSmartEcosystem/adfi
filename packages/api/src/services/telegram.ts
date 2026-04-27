// Telegram Bot API client. Telegram doesn't ship OAuth for bots — connection
// happens by pasting a bot token from @BotFather. We use just enough of the
// API to:
//   - validate a token (getMe)
//   - register / clear a webhook (setWebhook, deleteWebhook)
//   - resolve a channel handle to a chat_id (getChat)
//   - send a message to a private chat or channel (sendMessage)
//
// All calls use raw fetch — there's no official Node SDK we want to take a
// dep on for this surface.

const TG = "https://api.telegram.org";

export type TelegramBotIdentity = {
  id: number;
  username: string;
  firstName: string;
};

export type TelegramChat = {
  id: number;
  title: string | null;
  username: string | null;
  type: string;
};

type TelegramResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
};

async function call<T>(
  token: string,
  method: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const url = `${TG}/bot${token}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json()) as TelegramResponse<T>;
  if (!data.ok || data.result === undefined) {
    throw new Error(
      `telegram ${method} ${data.error_code ?? res.status}: ${data.description ?? "unknown error"}`,
    );
  }
  return data.result;
}

export type TelegramWebhookInfo = {
  url: string;
  hasCustomCertificate: boolean;
  pendingUpdateCount: number;
  lastErrorDate: number | null;
  lastErrorMessage: string | null;
  ipAddress: string | null;
};

// Reads the registered webhook info — useful when a bot isn't responding
// and we need to confirm Telegram is targeting the URL we think it is.
export async function getWebhookInfo(
  token: string,
): Promise<TelegramWebhookInfo> {
  const r = await call<{
    url: string;
    has_custom_certificate: boolean;
    pending_update_count: number;
    last_error_date?: number;
    last_error_message?: string;
    ip_address?: string;
  }>(token, "getWebhookInfo");
  return {
    url: r.url,
    hasCustomCertificate: r.has_custom_certificate,
    pendingUpdateCount: r.pending_update_count,
    lastErrorDate: r.last_error_date ?? null,
    lastErrorMessage: r.last_error_message ?? null,
    ipAddress: r.ip_address ?? null,
  };
}

export async function getMe(token: string): Promise<TelegramBotIdentity> {
  const r = await call<{ id: number; username: string; first_name: string }>(
    token,
    "getMe",
  );
  return { id: r.id, username: r.username, firstName: r.first_name };
}

export async function setWebhook(args: {
  token: string;
  url: string;
  secretToken?: string;
}): Promise<void> {
  await call(args.token, "setWebhook", {
    url: args.url,
    allowed_updates: ["message", "channel_post"],
    drop_pending_updates: false,
    ...(args.secretToken && { secret_token: args.secretToken }),
  });
}

export async function deleteWebhook(token: string): Promise<void> {
  try {
    await call(token, "deleteWebhook", { drop_pending_updates: false });
  } catch (err) {
    // Best-effort — disconnects shouldn't fail because Telegram is down.
    console.warn("telegram deleteWebhook failed:", err);
  }
}

export async function getChat(args: {
  token: string;
  chatId: string | number;
}): Promise<TelegramChat> {
  const r = await call<{
    id: number;
    title?: string;
    username?: string;
    type: string;
  }>(args.token, "getChat", { chat_id: args.chatId });
  return {
    id: r.id,
    title: r.title ?? null,
    username: r.username ?? null,
    type: r.type,
  };
}

export async function sendMessage(args: {
  token: string;
  chatId: string | number;
  text: string;
}): Promise<{ messageId: number }> {
  const r = await call<{ message_id: number }>(args.token, "sendMessage", {
    chat_id: args.chatId,
    text: args.text,
    disable_web_page_preview: false,
  });
  return { messageId: r.message_id };
}

// Best-effort fetch of a user's avatar URL via the Bot API. Two calls:
// getUserProfilePhotos to find the latest photo's file_id, then getFile to
// resolve a download path. The returned URL embeds the bot token and is
// stable as long as the bot stays connected — fine for inbox display.
// Returns null on any failure (user has no avatar, privacy blocks, etc.).
export async function getUserAvatarUrl(args: {
  token: string;
  userId: string | number;
}): Promise<string | null> {
  try {
    const photos = await call<{
      total_count: number;
      photos?: Array<Array<{ file_id: string; width: number }>>;
    }>(args.token, "getUserProfilePhotos", {
      user_id: args.userId,
      limit: 1,
    });
    const sizes = photos.photos?.[0];
    if (!sizes || sizes.length === 0) return null;
    // Pick the largest resolution available.
    const best = sizes.reduce((a, b) => (b.width > a.width ? b : a));
    const file = await call<{ file_path?: string }>(args.token, "getFile", {
      file_id: best.file_id,
    });
    if (!file.file_path) return null;
    return `https://api.telegram.org/file/bot${args.token}/${file.file_path}`;
  } catch (err) {
    console.warn("telegram getUserAvatarUrl failed:", err);
    return null;
  }
}

// Build the webhook url Telegram should call. We pack `<botId>.<routeSecret>`
// into the URL path so a single deployment can host webhooks for many bots
// (one per connected account) — the route handler parses out the bot id and
// validates the secret. Telegram doesn't sign payloads, so we *also* set the
// `secret_token` header which gets echoed back via X-Telegram-Bot-Api-Secret-Token.
export function buildWebhookUrl(args: {
  publicBaseUrl: string;
  routeSecret: string;
  botId: string | number;
}): string {
  const base = args.publicBaseUrl.replace(/\/$/, "");
  const slug = `${args.botId}.${args.routeSecret}`;
  return `${base}/api/webhooks/telegram/${encodeURIComponent(slug)}`;
}
