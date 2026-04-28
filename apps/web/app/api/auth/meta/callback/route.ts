import { NextResponse, type NextRequest } from "next/server";
import { db, Provider } from "@orb/db";
import { createServerClient } from "@orb/auth/server";
import {
  encryptToken,
  exchangeCodeForToken,
  extendToken,
  listPages,
  subscribePageWebhook,
} from "@orb/api";

const STATE_COOKIE = "meta_oauth_state";

function redirectUri(): string {
  const base =
    process.env.NEXT_PUBLIC_WEB_URL ??
    `https://${process.env.VERCEL_URL ?? "www.adfi.ca"}`;
  return `${base}/api/auth/meta/callback`;
}

function settingsRedirect(flash?: string): URL {
  const base =
    process.env.NEXT_PUBLIC_WEB_URL ??
    `https://${process.env.VERCEL_URL ?? "www.adfi.ca"}`;
  const url = new URL(`${base}/settings`);
  url.hash = "channels";
  if (flash) url.searchParams.set("connect", flash);
  return url;
}

export async function GET(req: NextRequest) {
  // Verbose logging on every entry so a 'silent' failure is no longer
  // silent — every branch shows up in Vercel logs with the params it
  // saw, the cookie it expected, and the host it was reached on.
  const params = Object.fromEntries(req.nextUrl.searchParams);
  console.log("[meta/callback] hit:", {
    host: req.nextUrl.host,
    pathname: req.nextUrl.pathname,
    params,
    hasStateCookie: req.cookies.has(STATE_COOKIE),
  });

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.warn("[meta/callback] no authed user — redirecting with error_unauthenticated");
    return NextResponse.redirect(settingsRedirect("error_unauthenticated"));
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code || !state) {
    console.warn("[meta/callback] missing required params:", {
      error,
      hasCode: !!code,
      hasState: !!state,
    });
    return NextResponse.redirect(
      settingsRedirect(error ? "error_denied" : "error_invalid"),
    );
  }

  const expected = req.cookies.get(STATE_COOKIE)?.value;
  if (!expected || expected !== state) {
    console.warn("[meta/callback] state cookie mismatch:", {
      hasExpected: !!expected,
      stateMatches: expected === state,
    });
    return NextResponse.redirect(settingsRedirect("error_state"));
  }

  try {
    // 1. code → short-lived → long-lived
    const short = await exchangeCodeForToken({ code, redirectUri: redirectUri() });
    const long = await extendToken(short.accessToken);

    // 2. fetch the pages this user manages
    const pages = await listPages(long.accessToken);
    if (pages.length === 0) {
      return NextResponse.redirect(settingsRedirect("error_no_pages"));
    }

    // V1 picks the first page. A real picker UI is the next step — for now
    // the user must have only one page connected to the app, which Meta's
    // permission model will enforce during the dialog anyway.
    const page = pages[0]!;

    const expiresAt = long.expiresIn
      ? new Date(Date.now() + long.expiresIn * 1000)
      : null;

    await db.connectedAccount.upsert({
      where: {
        userId_provider_externalId: {
          userId: user.id,
          provider: Provider.FACEBOOK,
          externalId: page.id,
        },
      },
      create: {
        userId: user.id,
        provider: Provider.FACEBOOK,
        externalId: page.id,
        encryptedToken: encryptToken(page.accessToken),
        scope: "page_access_token",
        expiresAt,
      },
      update: {
        encryptedToken: encryptToken(page.accessToken),
        scope: "page_access_token",
        expiresAt,
        disconnectedAt: null,
      },
    });

    // If the page also has an Instagram Business account, store that too.
    if (page.igBusinessId) {
      await db.connectedAccount.upsert({
        where: {
          userId_provider_externalId: {
            userId: user.id,
            provider: Provider.INSTAGRAM,
            externalId: page.igBusinessId,
          },
        },
        create: {
          userId: user.id,
          provider: Provider.INSTAGRAM,
          externalId: page.igBusinessId,
          encryptedToken: encryptToken(page.accessToken),
          scope: "ig_via_page",
          expiresAt,
        },
        update: {
          encryptedToken: encryptToken(page.accessToken),
          scope: "ig_via_page",
          expiresAt,
          disconnectedAt: null,
        },
      });
    }

    // 3. subscribe the page to webhook events. Best-effort — if this fails
    // the user is still connected; we just won't get inbound messenger.
    try {
      await subscribePageWebhook({
        pageId: page.id,
        pageAccessToken: page.accessToken,
        fields: ["messages", "messaging_postbacks", "feed"],
      });
    } catch (err) {
      console.warn("meta webhook subscribe failed:", err);
    }

    const res = NextResponse.redirect(settingsRedirect("ok"));
    res.cookies.delete(STATE_COOKIE);
    return res;
  } catch (err) {
    console.error("meta oauth callback failed:", err);
    return NextResponse.redirect(settingsRedirect("error_exchange"));
  }
}
