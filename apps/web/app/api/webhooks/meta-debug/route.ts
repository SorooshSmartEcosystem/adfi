import { NextResponse, type NextRequest } from "next/server";

// Debug-only webhook receiver. Accepts ANY GET/POST request and logs
// the entire payload (headers, query, body) so we can prove whether
// Meta is actually delivering events to our domain. Bypasses every
// auth check that could silently drop a real webhook handler:
//   - no signature verification
//   - GET handshake echoes hub.challenge with whatever token Meta
//     sent (so verify-and-save always succeeds)
//   - POST always returns 200
//
// This is intentionally permissive — anyone can hit it and we log
// everything they send. Will be removed once Meta delivery is
// confirmed working. Do not point any production webhook at this
// endpoint long-term.

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  console.log("[meta-debug] GET", {
    pathname: req.nextUrl.pathname,
    params,
    headers: {
      userAgent: req.headers.get("user-agent")?.slice(0, 80),
      forwardedFor: req.headers.get("x-forwarded-for"),
    },
  });
  // Echo whatever challenge Meta sends so verify-and-save always
  // succeeds. We don't care about the token here — this is a debug
  // probe, not real auth.
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  return new NextResponse(challenge ?? "ok", { status: 200 });
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    headers[k] = v;
  });
  console.log("[meta-debug] POST", {
    pathname: req.nextUrl.pathname,
    contentLength: raw.length,
    headers: {
      userAgent: headers["user-agent"]?.slice(0, 80),
      contentType: headers["content-type"],
      sigPresent: !!headers["x-hub-signature-256"],
      sigPreview: headers["x-hub-signature-256"]?.slice(0, 16),
    },
    bodyPreview: raw.slice(0, 500),
  });
  return NextResponse.json({ ok: true });
}
