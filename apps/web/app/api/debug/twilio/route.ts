import { NextResponse } from "next/server";

// Temporary diagnostic — gated by CRON_SECRET so not public. Delete after
// Twilio 20003 is resolved.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new NextResponse("no CRON_SECRET", { status: 401 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token) {
    return NextResponse.json(
      {
        error: "env missing",
        sidShape: sid ? `${sid.slice(0, 2)}***len=${sid.length}` : "MISSING",
        tokenShape: token ? `***len=${token.length}` : "MISSING",
      },
      { status: 500 },
    );
  }

  // Raw Basic Auth request to Twilio — bypasses the twilio SDK entirely.
  const authHeader = `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`;
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}.json`,
    { headers: { Authorization: authHeader } },
  );
  const bodyText = await res.text();

  return NextResponse.json({
    twilioStatus: res.status,
    twilioOk: res.ok,
    responsePreview: bodyText.slice(0, 300),
    sidShape: `${sid.slice(0, 2)}***${sid.slice(-2)} len=${sid.length}`,
    tokenShape: `***${token.slice(-2)} len=${token.length}`,
    // Hidden-character detection
    sidHasWhitespace: /\s/.test(sid),
    tokenHasWhitespace: /\s/.test(token),
    sidFirstThreeCharCodes: [
      sid.charCodeAt(0),
      sid.charCodeAt(1),
      sid.charCodeAt(2),
    ],
    sidLastThreeCharCodes: [
      sid.charCodeAt(sid.length - 3),
      sid.charCodeAt(sid.length - 2),
      sid.charCodeAt(sid.length - 1),
    ],
    tokenFirstThreeCharCodes: [
      token.charCodeAt(0),
      token.charCodeAt(1),
      token.charCodeAt(2),
    ],
    tokenLastThreeCharCodes: [
      token.charCodeAt(token.length - 3),
      token.charCodeAt(token.length - 2),
      token.charCodeAt(token.length - 1),
    ],
  });
}
