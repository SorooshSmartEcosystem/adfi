import { NextResponse } from "next/server";
import { validateTwilioSignature } from "@orb/api";
import { db, Agent, FindingSeverity } from "@orb/db";

// Fires asynchronously after Twilio finishes transcribing the
// over-cap voicemail. We look up the business via the dialed number
// and write a Finding so the founder sees the message in the inbox /
// daily pulse. Recording URL is included for cases where the
// transcript is "[inaudible]" or otherwise unhelpful.

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

  const to = params["To"];
  const from = params["From"];
  const transcript = params["TranscriptionText"]?.trim() ?? "";
  const recordingUrl = params["RecordingUrl"] ?? null;
  const transcriptionStatus = params["TranscriptionStatus"];

  if (!to || !from) {
    return new NextResponse("missing params", { status: 400 });
  }

  const phoneRecord = await db.phoneNumber.findFirst({
    where: { number: to, status: "ACTIVE" },
    select: { userId: true, businessId: true },
  });

  if (!phoneRecord) {
    return new NextResponse("unknown destination", { status: 200 });
  }

  await db.finding.create({
    data: {
      userId: phoneRecord.userId,
      agent: Agent.SIGNAL,
      severity: FindingSeverity.NEEDS_ATTENTION,
      summary: `voicemail from ${from} — over monthly call cap`,
      payload: {
        from,
        transcript: transcript || "(transcription unavailable)",
        recordingUrl,
        transcriptionStatus: transcriptionStatus ?? null,
        businessId: phoneRecord.businessId,
        reason: "monthly_voice_cap",
      },
    },
  });

  return new NextResponse("", { status: 200 });
}
