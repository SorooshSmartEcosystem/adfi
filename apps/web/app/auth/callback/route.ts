import { createServerClient } from "@orb/auth/server";
import { NextResponse } from "next/server";

type EmailOtpType =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "email";

// Auth callback. Handles three Supabase email-link flavors plus OAuth:
//
//   1. PKCE / OAuth:    ?code=...
//   2. Magic-link verify: ?token_hash=...&type=signup|magiclink|recovery|email_change|invite
//   3. Implicit (legacy): #access_token=...   (handled client-side by Supabase
//      automatically — we only see the redirect)
//
// The previous version only handled (1), so users clicking the link in
// their *signup confirmation* email — which uses the (2) format — got
// bounced back to /signin. Both shapes now log the user in and redirect
// to `next` (default /dashboard, or /onboarding for fresh signups).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next") ?? "/dashboard";

  const supabase = await createServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
    console.warn("[auth/callback] exchangeCodeForSession failed:", error.message);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
    console.warn("[auth/callback] verifyOtp failed:", error.message);
  } else {
    console.warn(
      "[auth/callback] no code or token_hash present — params:",
      Object.fromEntries(url.searchParams),
    );
  }

  return NextResponse.redirect(
    new URL("/signin?error=auth", url.origin),
  );
}
