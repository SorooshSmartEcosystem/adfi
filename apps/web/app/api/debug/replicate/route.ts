import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/require-admin";

// Hits Replicate's /v1/account from the running serverless function with
// the same REPLICATE_API_TOKEN our agents use. Confirms (a) the token is
// reaching the function, (b) which account it belongs to, (c) credit balance.
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "REPLICATE_API_TOKEN not set" }, { status: 500 });
  }

  const tokenPrefix = token.slice(0, 8);

  const accountRes = await fetch("https://api.replicate.com/v1/account", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const accountBody = await accountRes.text();

  // Try a tiny Flux Schnell prediction — surfaces 402/403/etc. directly so
  // we can see if the issue is specifically with running models vs auth.
  const predRes = await fetch(
    "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait=10",
      },
      body: JSON.stringify({
        input: {
          prompt: "a small cube on a white background",
          aspect_ratio: "1:1",
        },
      }),
    },
  );
  const predBody = await predRes.text();

  return NextResponse.json({
    tokenPrefix,
    accountStatus: accountRes.status,
    accountBody: accountBody.slice(0, 400),
    predictionStatus: predRes.status,
    predictionBody: predBody.slice(0, 800),
  });
}
