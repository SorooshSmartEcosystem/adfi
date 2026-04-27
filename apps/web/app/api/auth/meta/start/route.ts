import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { createServerClient } from "@orb/auth/server";
import { buildAuthorizeUrl } from "@orb/api";

const STATE_COOKIE = "meta_oauth_state";

function baseUrl(req: NextRequest): string {
  // Prefer NEXT_PUBLIC_WEB_URL; fall back to the request origin so we never
  // build a relative redirect URL (which would 500 inside NextResponse.redirect).
  const explicit = process.env.NEXT_PUBLIC_WEB_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  return req.nextUrl.origin;
}

// Begins the Facebook OAuth dialog. Stores a random `state` in an
// httpOnly cookie that the callback route verifies before exchanging the
// code for a token. Auth-required: an unauthenticated user trying to
// connect would be confusing — we'd have no user to attach tokens to.
export async function GET(req: NextRequest) {
  const base = baseUrl(req);

  // Surface env-config issues as a readable JSON 500 instead of a Vercel
  // generic error page so the support flow tells you what to fix.
  if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) {
    return NextResponse.json(
      {
        error:
          "Meta OAuth not configured — set META_APP_ID and META_APP_SECRET in the deploy environment, then redeploy.",
      },
      { status: 500 },
    );
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${base}/signin?next=/settings`);
  }

  try {
    const state = randomBytes(24).toString("base64url");
    const url = buildAuthorizeUrl({
      redirectUri: `${base}/api/auth/meta/callback`,
      state,
    });
    const res = NextResponse.redirect(url);
    res.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    return res;
  } catch (err) {
    console.error("meta oauth start failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
