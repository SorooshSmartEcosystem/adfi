import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createServerClient } from "@orb/auth/server";
import { buildAuthorizeUrl } from "@orb/api";

const STATE_COOKIE = "meta_oauth_state";

function redirectUri(): string {
  const base =
    process.env.NEXT_PUBLIC_WEB_URL ??
    `https://${process.env.VERCEL_URL ?? "www.adfi.ca"}`;
  return `${base}/api/auth/meta/callback`;
}

// Begins the Facebook OAuth dialog. Stores a random `state` in an
// httpOnly cookie that the callback route verifies before exchanging the
// code for a token. Auth-required: an unauthenticated user trying to
// connect would be confusing — we'd have no user to attach tokens to.
export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_WEB_URL ?? ""}/signin?next=/settings`,
    );
  }

  const state = randomBytes(24).toString("base64url");
  const url = buildAuthorizeUrl({ redirectUri: redirectUri(), state });
  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
