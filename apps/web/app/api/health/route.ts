import { NextResponse } from "next/server";

// Lightweight health/warmer endpoint. Two purposes:
//   1. Vercel cron pings this every 5 minutes (see vercel.json) so the
//      serverless function stays warm during business hours — first
//      real user request after idle would otherwise eat a 1-2s cold
//      start.
//   2. External uptime monitors (Better Uptime, UptimeRobot) can hit
//      this for liveness checks.
//
// Keep this dead simple — no DB queries, no LLM calls. The whole point
// is that it returns instantly and warms the JS runtime.

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
  });
}
