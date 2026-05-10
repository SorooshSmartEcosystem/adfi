// Voice relay — Twilio ConversationRelay <-> Anthropic via runSignal.
//
// Twilio terminates the SIP call, runs Cartesia TTS + Deepgram STT for
// us, and shovels JSON messages over a single WebSocket per call. We
// own the conversation state machine: hold the per-call history, run
// runSignal on each user turn, push the response back as `text` events
// for Cartesia to speak. On disconnect we persist a Call row so the
// monthly minute cap (guardInboundCall) reflects what was used.
//
// Why a separate Fly.io service: Vercel Functions don't host persistent
// WebSockets. Keeping this in the same repo (not a packages/* module
// per the project's "no new top-level packages without discussion"
// rule, but an apps/* sibling to web/admin/mobile) means it shares
// @orb/api + @orb/db and the same runSignal logic Signal uses for SMS
// + Messenger + Telegram.

import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { runSignal, type SignalOutput } from "@orb/api";
import {
  db,
  Agent,
  CallStatus,
  Direction,
  FindingSeverity,
  type Prisma,
} from "@orb/db";

type SetupParams = {
  userId: string;
  businessId: string;
  phoneNumberId: string;
  from: string;
  callSid: string;
};

type ConversationMessage = {
  direction: Direction;
  body: string;
};

type CallContext = {
  setup: SetupParams;
  brandVoice: unknown;
  faqText: string | null;
  businessName: string | null;
  businessDescription: string;
  history: ConversationMessage[];
  startedAt: Date;
  lastIntent: SignalOutput["intent"] | null;
  needsHandoff: boolean;
  suggestedAction: SignalOutput["suggestedAction"] | null;
};

const PORT = Number.parseInt(process.env["PORT"] ?? "8787", 10);

// Twilio's ConversationRelay sends/expects these JSON shapes. Subset we
// actually use — the protocol has more events (interrupt, dtmf, error)
// we currently let pass through without specific handling.
type RelayInbound =
  | {
      type: "setup";
      callSid?: string;
      sessionId?: string;
      from?: string;
      to?: string;
      customParameters?: Record<string, string>;
    }
  | { type: "prompt"; voicePrompt: string; last: boolean; lang?: string }
  | { type: "interrupt"; durationUntilInterruptMs?: number }
  | { type: "dtmf"; digit: string }
  | { type: "error"; description?: string };

type RelayOutbound =
  | { type: "text"; token: string; last: boolean }
  | { type: "end"; handoffData?: string };

function send(ws: WebSocket, msg: RelayOutbound): void {
  ws.send(JSON.stringify(msg));
}

async function loadCallContext(
  setup: SetupParams,
): Promise<Omit<CallContext, "history" | "startedAt" | "lastIntent" | "needsHandoff" | "suggestedAction"> | null> {
  // Pull the same shape SMS / Messenger / Telegram pull. The webhook
  // already validated the user/business/brand-voice, but we re-load
  // here because the WS connection arrives independently.
  const phone = await db.phoneNumber.findUnique({
    where: { id: setup.phoneNumberId },
    include: {
      user: { include: { agentContexts: true } },
      business: true,
    },
  });
  if (!phone) return null;
  const ac = phone.user.agentContexts?.[0];
  if (!ac?.strategistOutput) return null;

  return {
    setup,
    brandVoice: ac.strategistOutput,
    faqText: ac.faqText ?? null,
    businessName: phone.business?.name ?? phone.user.businessName ?? null,
    businessDescription: phone.user.businessDescription ?? "",
  };
}

async function persistCallEnd(ctx: CallContext): Promise<void> {
  const endedAt = new Date();
  const durationSeconds = Math.max(
    0,
    Math.round((endedAt.getTime() - ctx.startedAt.getTime()) / 1000),
  );

  // Compose a transcript blob from the in-memory history. We could
  // instead store each turn as Message rows (mirroring SMS), but the
  // inbox UI currently doesn't render voice as a thread — a single
  // transcript-on-Call row is fine for v1 and keeps the call stats
  // page (calls.list) the only consumer.
  const transcript = ctx.history
    .map(
      (m) => `${m.direction === Direction.INBOUND ? "Caller" : "You"}: ${m.body}`,
    )
    .join("\n");

  // status: ANSWERED_BY_SIGNAL covers the live-AI path. needsHandoff
  // → also write a Finding for the founder.
  await db.call.create({
    data: {
      userId: ctx.setup.userId,
      businessId: ctx.setup.businessId || null,
      fromNumber: ctx.setup.from,
      durationSeconds,
      transcriptUrl: null,
      extractedIntent: ctx.lastIntent
        ? ({
            category: ctx.lastIntent,
            transcript,
            suggestedAction: ctx.suggestedAction ?? null,
          } as Prisma.InputJsonValue)
        : ({ transcript } as Prisma.InputJsonValue),
      recoveredStatus: CallStatus.ANSWERED_BY_SIGNAL,
      startedAt: ctx.startedAt,
    },
  });

  await db.agentEvent.create({
    data: {
      userId: ctx.setup.userId,
      agent: Agent.SIGNAL,
      eventType: "call_handled",
      payload: {
        callSid: ctx.setup.callSid,
        durationSeconds,
        intent: ctx.lastIntent,
        turns: ctx.history.length,
        needsHandoff: ctx.needsHandoff,
      },
    },
  });

  // Hand-off Finding when Signal flagged the call as needing the
  // founder, OR when a create_appointment was proposed. No calendar
  // integration in v1 — the founder confirms manually from the inbox.
  // We don't write an Appointment row here because the schema requires
  // a concrete scheduledFor + customerName which Signal doesn't reliably
  // produce from a 30-second voice call; promoting a Finding to an
  // Appointment is a separate user action.
  const isAppointment =
    ctx.suggestedAction?.type === "create_appointment" &&
    ctx.suggestedAction.summary;
  if (ctx.needsHandoff || isAppointment) {
    await db.finding.create({
      data: {
        userId: ctx.setup.userId,
        agent: Agent.SIGNAL,
        severity: FindingSeverity.NEEDS_ATTENTION,
        summary: isAppointment
          ? `${ctx.setup.from} wants to book — ${ctx.suggestedAction?.summary ?? ""}`
          : `${ctx.setup.from} called and needs your attention`,
        payload: {
          callSid: ctx.setup.callSid,
          intent: ctx.lastIntent,
          transcript,
          suggestedAction: ctx.suggestedAction ?? null,
        },
      },
    });
  }
}

function parseSetup(payload: RelayInbound): SetupParams | null {
  if (payload.type !== "setup") return null;
  const cp = payload.customParameters ?? {};
  const userId = cp["userId"];
  const phoneNumberId = cp["phoneNumberId"];
  const from = cp["from"] ?? payload.from;
  const callSid = cp["callSid"] ?? payload.callSid;
  if (!userId || !phoneNumberId || !from || !callSid) return null;
  return {
    userId,
    businessId: cp["businessId"] ?? "",
    phoneNumberId,
    from,
    callSid,
  };
}

function handleConnection(ws: WebSocket): void {
  let ctx: CallContext | null = null;
  let closed = false;

  ws.on("message", (raw) => {
    void (async () => {
      let payload: RelayInbound;
      try {
        payload = JSON.parse(raw.toString()) as RelayInbound;
      } catch (err) {
        console.error("voice-relay: bad JSON from Twilio:", err);
        return;
      }

      if (payload.type === "setup") {
        const setup = parseSetup(payload);
        if (!setup) {
          console.error(
            "voice-relay: setup missing required customParameters",
            payload,
          );
          send(ws, { type: "end" });
          ws.close();
          return;
        }
        const loaded = await loadCallContext(setup);
        if (!loaded) {
          console.error("voice-relay: context load failed", setup);
          send(ws, { type: "end" });
          ws.close();
          return;
        }
        ctx = {
          ...loaded,
          history: [],
          startedAt: new Date(),
          lastIntent: null,
          needsHandoff: false,
          suggestedAction: null,
        };
        return;
      }

      if (!ctx) {
        // Out-of-order — ignore until setup arrives.
        return;
      }

      if (payload.type === "prompt") {
        if (!payload.last) {
          // Twilio sends interim prompts as the user speaks; we only
          // act on the final transcript to avoid mid-utterance LLM calls.
          return;
        }
        const inboundBody = payload.voicePrompt.trim();
        if (!inboundBody) return;

        ctx.history.push({ direction: Direction.INBOUND, body: inboundBody });

        let result: SignalOutput;
        try {
          result = await runSignal({
            brandVoice: ctx.brandVoice,
            businessName: ctx.businessName,
            businessDescription: ctx.businessDescription,
            faqText: ctx.faqText,
            threadHistory: ctx.history.slice(0, -1),
            inboundMessage: inboundBody,
            userId: ctx.setup.userId,
          });
        } catch (err) {
          console.error("voice-relay: runSignal threw", err);
          send(ws, {
            type: "text",
            token: "sorry, give me one second.",
            last: true,
          });
          return;
        }

        ctx.history.push({ direction: Direction.OUTBOUND, body: result.response });
        ctx.lastIntent = result.intent;
        ctx.needsHandoff = ctx.needsHandoff || result.needsHandoff;
        if (result.suggestedAction && result.suggestedAction.type !== "none") {
          ctx.suggestedAction = result.suggestedAction;
        }

        // Single text payload — Cartesia handles sentence-level
        // streaming itself, so chunking here is unnecessary and would
        // only add round-trip latency.
        send(ws, { type: "text", token: result.response, last: true });
        return;
      }

      // interrupt / dtmf / error — pass through without action for v1.
    })().catch((err) => {
      console.error("voice-relay: message handler crashed", err);
    });
  });

  ws.on("close", () => {
    if (closed) return;
    closed = true;
    if (!ctx) return;
    persistCallEnd(ctx).catch((err) => {
      console.error("voice-relay: persistCallEnd failed", err);
    });
  });

  ws.on("error", (err) => {
    console.error("voice-relay: socket error", err);
  });
}

const httpServer = createServer((req, res) => {
  // Tiny health check for Fly.io.
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server: httpServer });
wss.on("connection", handleConnection);

httpServer.listen(PORT, () => {
  console.log(`voice-relay listening on :${PORT}`);
});
