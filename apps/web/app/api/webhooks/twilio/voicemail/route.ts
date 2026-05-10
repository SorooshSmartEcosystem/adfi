import { NextResponse } from "next/server";
import { validateTwilioSignature } from "@orb/api";

// Twilio fires this when the over-cap voicemail recording finishes.
// We don't write the Finding here — we wait for the transcript
// callback (next route) so the founder sees the actual message text
// in the inbox, not just a recording URL. This route just returns
// empty TwiML so Twilio hangs up cleanly.

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

  // Empty TwiML — the <Record> already played the close-out say + hangup.
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response/>`, {
    status: 200,
    headers: { "content-type": "text/xml; charset=utf-8" },
  });
}
