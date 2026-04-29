import { NextResponse, type NextRequest } from "next/server";
import { db } from "@orb/db";
import {
  decryptToken,
  processInboundMessenger,
  sendMessengerReply,
  verifyWebhookSignature,
} from "@orb/api";

export const runtime = "nodejs";
export const maxDuration = 60;

// GET — verification handshake. Meta sends:
//   ?hub.mode=subscribe&hub.verify_token=<our token>&hub.challenge=<random>
// We echo hub.challenge if the verify token matches.
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;

  // Verbose: log every handshake attempt so we can tell from logs
  // alone why a verify failed. tokenMatches/expectedSet bools — never
  // log the token values themselves (they're effectively secrets).
  console.log("[meta-webhook] GET handshake", {
    mode,
    hasToken: !!token,
    hasExpected: !!expected,
    tokenMatches: !!token && !!expected && token === expected,
    challengePresent: !!challenge,
  });

  if (mode === "subscribe" && token && expected && token === expected) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("forbidden", { status: 403 });
}

// POST — incoming events. Spec: https://developers.facebook.com/docs/graph-api/webhooks/reference
// We only handle messaging events for v1. Returns 200 fast (Meta retries
// on non-200, so any slow/failing branch becomes a duplicate-message
// problem). Heavy work runs awaited because Vercel kills detached promises.
export async function POST(req: NextRequest) {
  // First-line entry log — fires before any verification so we can see
  // in Vercel that *something* arrived even when downstream checks
  // reject the payload. Helps distinguish "Meta isn't delivering" from
  // "Meta delivers but we 401 it".
  console.log("[meta-webhook] POST entry", {
    contentLength: req.headers.get("content-length"),
    hasSig: !!req.headers.get("x-hub-signature-256"),
    userAgent: req.headers.get("user-agent")?.slice(0, 80),
  });

  const raw = await req.text();
  const sig = req.headers.get("x-hub-signature-256");
  if (!verifyWebhookSignature({ rawBody: raw, signatureHeader: sig })) {
    console.warn("[meta-webhook] bad signature", {
      bodyPreview: raw.slice(0, 200),
      sigPreview: sig?.slice(0, 16),
    });
    return new NextResponse("bad signature", { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new NextResponse("bad json", { status: 400 });
  }

  console.log(
    `[meta-webhook] object=${payload.object} entries=${(payload.entry ?? []).length}`,
  );

  if (payload.object !== "page" && payload.object !== "instagram") {
    console.log(`[meta-webhook] skipping object=${payload.object}`);
    return NextResponse.json({ ok: true });
  }

  for (const entry of payload.entry ?? []) {
    const channel: "MESSENGER" | "INSTAGRAM_DM" =
      payload.object === "instagram" ? "INSTAGRAM_DM" : "MESSENGER";

    const messagingCount = (entry.messaging ?? []).length;
    const changesCount = (entry.changes ?? []).length;
    console.log(
      `[meta-webhook] entry.id=${entry.id} channel=${channel} messaging=${messagingCount} changes=${changesCount}`,
    );

    if (messagingCount === 0) {
      // Most likely a 'feed' or 'changes'-shaped event (page post/comment),
      // not a DM. Skip silently — v1 only handles inbound DMs.
      continue;
    }

    for (const event of entry.messaging ?? []) {
      // Skip echoes of our own outbound messages.
      if (event.message?.is_echo) {
        console.log(`[meta-webhook] skipping echo from sender=${event.sender?.id}`);
        continue;
      }
      const text = event.message?.text;
      if (!text || !event.sender?.id) {
        console.log(
          `[meta-webhook] skipping event — text=${!!text} sender=${!!event.sender?.id}`,
        );
        continue;
      }

      console.log(
        `[meta-webhook] inbound ${channel} from=${event.sender.id} text="${text.slice(0, 80)}"`,
      );

      const result = await processInboundMessenger({
        pageId: entry.id,
        senderPsid: event.sender.id,
        body: text,
        channel,
      }).catch((err) => {
        console.error("[meta-webhook] processInboundMessenger threw:", err);
        return null;
      });

      console.log(
        `[meta-webhook] processed: handled=${result?.handled} reason=${result?.reason ?? "n/a"} hasReply=${!!result?.reply}`,
      );

      if (!result?.handled || !result.reply) continue;

      // Reply via the page access token tied to this entry.
      const account = await db.connectedAccount.findFirst({
        where: { externalId: entry.id, disconnectedAt: null },
      });
      if (!account) {
        console.warn(
          `[meta-webhook] no ConnectedAccount for entry.id=${entry.id} — cannot send reply`,
        );
        continue;
      }

      try {
        await sendMessengerReply({
          pageAccessToken: decryptToken(account.encryptedToken),
          recipientPsid: event.sender.id,
          text: result.reply,
        });
        console.log(`[meta-webhook] reply sent to ${event.sender.id}`);
      } catch (err) {
        console.error("[meta-webhook] reply send failed:", err);
      }
    }
  }

  return NextResponse.json({ ok: true });
}

type WebhookPayload = {
  object: string;
  entry?: Array<{
    id: string;
    time: number;
    messaging?: Array<{
      sender?: { id: string };
      recipient?: { id: string };
      timestamp: number;
      message?: {
        mid?: string;
        text?: string;
        is_echo?: boolean;
      };
    }>;
    changes?: Array<{
      field: string;
      value: unknown;
    }>;
  }>;
};
