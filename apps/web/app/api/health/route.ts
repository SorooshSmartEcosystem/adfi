import { NextResponse } from "next/server";

// Lightweight health/warmer endpoint.
//
// Vercel cron hits this once a day (Hobby plan limits cron to daily,
// so the every-5-min warmer doesn't run there — daily ping at least
// keeps the route definition exercised by Vercel's build pipeline).
//
// For real warming on Hobby, point an external uptime monitor at
// https://www.adfi.ca/api/health with a 5-min interval. Free options:
//   • UptimeRobot — https://uptimerobot.com (free 5-min interval)
//   • Better Stack — https://betterstack.com (free 3-min interval)
//   • Cronitor — https://cronitor.io (free daily, paid more frequent)
// Pro Vercel users can switch the schedule in vercel.json back to
// "*/5 * * * *" for native warming.
//
// External uptime monitors also catch downtime — if the function
// errors, the monitor pages you. Two birds, one cron.
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
