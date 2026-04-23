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
