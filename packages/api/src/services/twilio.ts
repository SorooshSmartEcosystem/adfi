import { Twilio, validateRequest } from "twilio";

let client: Twilio | null = null;

export function twilio(): Twilio {
  if (!client) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    // TEMP diagnostic for 20003 debugging — no secrets revealed, just shape.
    console.log(
      "[Twilio diag] sid=",
      accountSid
        ? `${accountSid.slice(0, 2)}*** len=${accountSid.length}`
        : "MISSING",
      "token=",
      authToken ? `*** len=${authToken.length}` : "MISSING",
    );
    if (!accountSid || !authToken) {
      throw new Error(
        "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set to use the Twilio service",
      );
    }
    client = new Twilio(accountSid, authToken);
  }
  return client;
}

export async function sendSms(args: {
  from: string;
  to: string;
  body: string;
}): Promise<void> {
  await twilio().messages.create({
    from: args.from,
    to: args.to,
    body: args.body,
  });
}

// Validates the X-Twilio-Signature header on incoming webhook requests.
// Returns false (not throws) when auth token is missing — the webhook
// handler decides what to do with the falsey result.
export function validateTwilioSignature(args: {
  signature: string;
  url: string;
  params: Record<string, string>;
}): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return false;
  return validateRequest(authToken, args.signature, args.url, args.params);
}

// Buys a local phone number and configures both inbound SMS and voice
// webhooks to the ADFI Signal handlers. Voice routes through the
// /twilio/voice TwiML endpoint which connects callers to the
// ConversationRelay WS server (apps/voice-relay) for live AI answering.
export async function provisionNumber(args: {
  webhookBaseUrl: string;
  country?: string;
  areaCode?: number;
}): Promise<{ number: string; twilioSid: string }> {
  const c = twilio();
  const country = args.country ?? "US";

  const available = await c.availablePhoneNumbers(country).local.list({
    limit: 1,
    ...(args.areaCode ? { areaCode: args.areaCode } : {}),
  });

  if (available.length === 0) {
    throw new Error(`No local numbers available in ${country}`);
  }

  const candidate = available[0];
  if (!candidate?.phoneNumber) {
    throw new Error("Twilio returned a candidate with no phone number");
  }

  const purchased = await c.incomingPhoneNumbers.create({
    phoneNumber: candidate.phoneNumber,
    smsUrl: `${args.webhookBaseUrl}/api/webhooks/twilio/sms`,
    smsMethod: "POST",
    voiceUrl: `${args.webhookBaseUrl}/api/webhooks/twilio/voice`,
    voiceMethod: "POST",
  });

  return {
    number: purchased.phoneNumber,
    twilioSid: purchased.sid,
  };
}

// Releases a Twilio number — stops the monthly $1.15 charge. Idempotent:
// a 404 from Twilio is treated as success (number was already released
// or was never owned by us). Other errors propagate so the caller can
// surface them in the admin UI.
export async function releaseNumber(twilioSid: string): Promise<void> {
  try {
    await twilio().incomingPhoneNumbers(twilioSid).remove();
  } catch (err: unknown) {
    const status =
      typeof err === "object" && err && "status" in err
        ? (err as { status?: number }).status
        : undefined;
    if (status === 404) return;
    throw err;
  }
}

// Re-points an existing number's webhooks at our current base URL —
// useful when the production domain changes or when we add the voice
// URL to numbers that were provisioned before voice support shipped.
export async function syncNumberWebhooks(args: {
  twilioSid: string;
  webhookBaseUrl: string;
}): Promise<void> {
  await twilio()
    .incomingPhoneNumbers(args.twilioSid)
    .update({
      smsUrl: `${args.webhookBaseUrl}/api/webhooks/twilio/sms`,
      smsMethod: "POST",
      voiceUrl: `${args.webhookBaseUrl}/api/webhooks/twilio/voice`,
      voiceMethod: "POST",
    });
}
