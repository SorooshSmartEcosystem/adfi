import { NextResponse, type NextRequest } from "next/server";
import { db } from "@orb/db";
import {
  decryptToken,
  processInboundTelegram,
  sendTelegramMessage,
  sendTelegramTypingAction,
} from "@orb/api";

export const runtime = "nodejs";
export const maxDuration = 60;

// Telegram delivers updates by POSTing here. The path segment is `<botId>.<routeSecret>`
// so we can route the update to the correct ConnectedAccount even when many
// bots share this single endpoint. Telegram doesn't sign payloads — instead we
// also require an X-Telegram-Bot-Api-Secret-Token header that matches the
// shared deployment secret.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ secret: string }> },
) {
  const { secret: slug } = await params;
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) {
    return new NextResponse("not configured", { status: 500 });
  }

  const dot = slug.indexOf(".");
  if (dot < 1) return new NextResponse("forbidden", { status: 403 });
  const botId = slug.slice(0, dot);
  const routeSecret = slug.slice(dot + 1);
  if (routeSecret !== expected) {
    return new NextResponse("forbidden", { status: 403 });
  }

  const headerSecret = req.headers.get("x-telegram-bot-api-secret-token");
  if (headerSecret !== expected) {
    console.warn("[telegram-webhook] header secret mismatch");
    return new NextResponse("forbidden", { status: 403 });
  }

  let payload: TelegramUpdate;
  try {
    payload = (await req.json()) as TelegramUpdate;
  } catch {
    return new NextResponse("bad json", { status: 400 });
  }

  const msg = payload.message;
  if (!msg || !msg.text || !msg.from || msg.chat?.type !== "private") {
    return NextResponse.json({ ok: true });
  }

  const account = await db.connectedAccount.findFirst({
    where: {
      provider: "TELEGRAM",
      externalId: botId,
      disconnectedAt: null,
    },
  });
  if (!account) {
    console.warn(`[telegram-webhook] no active TELEGRAM account for bot ${botId}`);
    return NextResponse.json({ ok: true });
  }

  const fromName =
    [msg.from.first_name, msg.from.last_name].filter(Boolean).join(" ") ||
    msg.from.username ||
    null;

  // Show "typing…" in the user's chat immediately so they see activity
  // while signal runs the LLM. Telegram auto-clears it after 5s, and
  // signal calls typically finish within that window. Best-effort.
  const botToken = decryptToken(account.encryptedToken);
  void sendTelegramTypingAction({ token: botToken, chatId: msg.chat.id });

  const result = await processInboundTelegram({
    botId,
    fromId: String(msg.from.id),
    fromName,
    body: msg.text,
  }).catch((err) => {
    console.error("[telegram-webhook] processInboundTelegram threw:", err);
    return null;
  });

  if (!result?.handled || !result.reply) {
    return NextResponse.json({ ok: true });
  }

  try {
    await sendTelegramMessage({
      token: botToken,
      chatId: msg.chat.id,
      text: result.reply,
    });
  } catch (err) {
    console.error("[telegram-webhook] reply send failed:", err);
  }

  return NextResponse.json({ ok: true });
}

type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
    chat?: {
      id: number;
      type: "private" | "group" | "supergroup" | "channel";
    };
    text?: string;
    date: number;
  };
};
