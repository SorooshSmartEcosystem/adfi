import { NextResponse, type NextRequest } from "next/server";

// Public status endpoint Meta links users to after they request data
// deletion. We return a tiny human-readable confirmation page rather
// than JSON because Meta surfaces it as a clickable link in the user's
// account settings — JSON would render as raw text in the browser.

export const runtime = "nodejs";

export function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code") ?? "(no code provided)";
  const safeCode = code.replace(/[^a-zA-Z0-9-]/g, "");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>adfi — data deletion status</title>
  <style>
    body {
      font-family: -apple-system, "SF Pro Text", system-ui, sans-serif;
      background: #FAFAF7;
      color: #111;
      max-width: 540px;
      margin: 80px auto;
      padding: 0 24px;
      line-height: 1.55;
    }
    h1 { font-size: 22px; font-weight: 500; margin: 0 0 16px; }
    p { color: #444; margin: 0 0 12px; }
    code {
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
      background: #f0eee9;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 13px;
    }
    a { color: #111; }
  </style>
</head>
<body>
  <h1>your data deletion request was received.</h1>
  <p>your facebook and instagram connections have been disconnected
  from adfi. tokens are no longer in use, and any usage data tied to
  your account is queued for permanent removal within 30 days.</p>
  <p>confirmation code: <code>${safeCode}</code></p>
  <p>questions? email <a href="mailto:soroushosivand@gmail.com">soroushosivand@gmail.com</a> with this code.</p>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
