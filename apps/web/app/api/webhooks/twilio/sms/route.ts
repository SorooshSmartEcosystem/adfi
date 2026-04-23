import { NextResponse } from "next/server";
import {
  processInboundSms,
  validateTwilioSignature,
} from "@orb/api";

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
  const body = params["Body"];

  if (!from || !to || !body) {
    return new NextResponse("missing params", { status: 400 });
  }

  try {
    await processInboundSms({ from, to, body });
  } catch (error) {
    // Log and swallow so we don't spam the customer with retries on transient
    // agent failures. Twilio's webhook contract: 2xx = delivered. Real error
    // alerting belongs in Sentry/logs (deferred).
    console.error("Signal SMS processing failed:", error);
  }

  return new NextResponse("", { status: 200 });
}
