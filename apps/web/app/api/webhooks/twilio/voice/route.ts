import { NextResponse } from "next/server";
import {
  prepareInboundCall,
  validateTwilioSignature,
  type CallDecision,
} from "@orb/api";

// Twilio voice webhook. Twilio expects TwiML back synchronously (<100ms),
// so we only do cheap DB lookups + frozen gates here and let the
// ConversationRelay WebSocket server (apps/voice-relay on Fly.io) own
// the actual conversation lifecycle.
//
// All <Say> fallback messages must speak AS the business — never
// "ADFI" or "AI", per feedback_signal_no_adfi_leak.

function twiml(body: string): NextResponse {
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?>${body}`, {
    status: 200,
    headers: { "content-type": "text/xml; charset=utf-8" },
  });
}

function fallbackSay(message: string): string {
  // Polly.Joanna-Neural is a default-available Twilio voice; the high
  // quality voice (Cartesia / ElevenLabs) is used inside ConversationRelay
  // for the live conversation, not these short edge messages.
  return `<Response><Say voice="Polly.Joanna-Neural">${escapeXml(message)}</Say><Hangup/></Response>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function reasonMessage(reason: Extract<CallDecision, { allow: false }>["reason"]): string {
  switch (reason) {
    case "unknown_destination":
      return "this number isn't connected to a business yet. goodbye.";
    case "user_frozen":
    case "business_frozen":
      return "this line isn't taking calls right now. please try again later.";
    case "no_brand_voice":
      return "this line is being set up. please try again in a bit.";
    case "monthly_voice_cap":
      // Should never reach here — handled separately as a voicemail flow.
      return "we're at capacity right now. please leave a message.";
  }
}

// Voicemail TwiML — the over-cap fallback. Says a short greeting AS
// the business, records up to 2 minutes, and posts the recording URL
// + transcript to the voicemail webhook which writes a Finding.
function voicemailTwiml(businessName: string | null): string {
  const greeting = businessName?.trim()
    ? `${businessName.trim()} — i can't pick up right now. leave a quick message after the beep and i'll get back to you.`
    : "i can't pick up right now. leave a quick message after the beep and i'll get back to you.";
  return `<Response><Say voice="Polly.Joanna-Neural">${escapeXml(greeting)}</Say><Record action="/api/webhooks/twilio/voicemail" method="POST" maxLength="120" playBeep="true" transcribe="true" transcribeCallback="/api/webhooks/twilio/voicemail-transcript" finishOnKey="#"/><Say voice="Polly.Joanna-Neural">thanks. talk soon.</Say><Hangup/></Response>`;
}

export async function POST(request: Request) {
  const signature = request.headers.get("x-twilio-signature");
  if (!signature) {
    return new NextResponse("missing signature", { status: 401 });
  }

  const formData = await request.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of formData) {
    params[key] = value.toString();
  }

  if (
    !validateTwilioSignature({
      signature,
      url: request.url,
      params,
    })
  ) {
    return new NextResponse("invalid signature", { status: 401 });
  }

  const from = params["From"];
  const to = params["To"];
  const callSid = params["CallSid"];

  if (!from || !to || !callSid) {
    return new NextResponse("missing params", { status: 400 });
  }

  let decision: CallDecision;
  try {
    decision = await prepareInboundCall({ to });
  } catch (err) {
    console.error("prepareInboundCall threw:", err);
    return twiml(
      fallbackSay("we're having trouble right now. please try again."),
    );
  }

  if (!decision.allow) {
    if (decision.reason === "monthly_voice_cap") {
      // Look up the business name for a personalized voicemail greeting.
      // Cheap second lookup — only fires when over cap, which is rare.
      const { db } = await import("@orb/db");
      const phoneRecord = await db.phoneNumber.findFirst({
        where: { number: to, status: "ACTIVE" },
        include: { business: true, user: { select: { businessName: true } } },
      });
      const name =
        phoneRecord?.business?.name ?? phoneRecord?.user.businessName ?? null;
      return twiml(voicemailTwiml(name));
    }
    return twiml(fallbackSay(reasonMessage(decision.reason)));
  }

  const relayUrl = process.env["VOICE_RELAY_WS_URL"];
  if (!relayUrl) {
    console.error("VOICE_RELAY_WS_URL not set — cannot connect to relay");
    return twiml(
      fallbackSay("we're having trouble right now. please try again."),
    );
  }

  // ConversationRelay configuration — Twilio handles the inbound audio
  // stream and the TTS playback, our WS server just exchanges text
  // turns with Anthropic. Cartesia Sonic is the chosen TTS provider
  // (sounds great, ~$0.06/min all-in vs ~$0.27/min for ElevenLabs Turbo).
  // Custom <Parameter>s arrive in the WS setup payload so the relay can
  // load the right business context without a second DB roundtrip.
  const params_xml = [
    ["userId", decision.userId],
    ["businessId", decision.businessId ?? ""],
    ["phoneNumberId", decision.phoneNumberId],
    ["from", from],
    ["callSid", callSid],
  ]
    .map(
      ([k, v]) =>
        `<Parameter name="${escapeXml(k!)}" value="${escapeXml(v ?? "")}"/>`,
    )
    .join("");

  return twiml(
    `<Response><Connect><ConversationRelay url="${escapeXml(relayUrl)}" ttsProvider="cartesia" voice="sonic-english" welcomeGreeting="${escapeXml(buildGreeting(decision.businessName))}">${params_xml}</ConversationRelay></Connect></Response>`,
  );
}

function buildGreeting(businessName: string | null): string {
  // Short, confident, sounds like the owner picked up. Never mentions
  // "ADFI" or "AI" — Signal speaks AS the business.
  if (businessName?.trim()) {
    return `${businessName.trim()} — how can i help?`;
  }
  return "hi — how can i help?";
}
