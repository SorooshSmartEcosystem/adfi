import { NextResponse } from "next/server";

// Hits Replicate's /v1/account from the running serverless function with
// the same REPLICATE_API_TOKEN our agents use. Confirms (a) the token is
// reaching the function, (b) which account it belongs to, (c) credit balance.
export async function GET() {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "REPLICATE_API_TOKEN not set" }, { status: 500 });
  }

  const tokenPrefix = token.slice(0, 8);

  const accountRes = await fetch("https://api.replicate.com/v1/account", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const accountBody = await accountRes.text();

  return NextResponse.json({
    tokenPrefix,
    accountStatus: accountRes.status,
    accountBody: accountBody.slice(0, 800),
  });
}
