import { Twilio, validateRequest } from "twilio";

let client: Twilio | null = null;

export function twilio(): Twilio {
  if (!client) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
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

// Buys a local phone number and configures its inbound SMS webhook to the
// ADFI Signal handler. Voice URL is left default until Vapi is wired.
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
  });

  return {
    number: purchased.phoneNumber,
    twilioSid: purchased.sid,
  };
}
