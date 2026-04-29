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
    console.log("[meta/callback] pages from Graph:", {
      count: pages.length,
      summaries: pages.map((p) => ({
        id: p.id,
        name: p.name,
        hasIg: !!p.igBusinessId,
      })),
    });
    if (pages.length === 0) {
      return NextResponse.redirect(settingsRedirect("error_no_pages"));
    }

    // Page selection. Old code auto-picked pages[0] — broken when the
    // user has multiple FB Pages and the IG-linked one isn't first.
    // Strong-prefer any page with an instagram_business_account; only
    // fall back to the first page if none of them have IG linked. The
    // settings UI uses ok_fb_only to surface "you need to link IG to
    // your Page" recovery steps in the latter case.
    const pageWithIg = pages.find((p) => p.igBusinessId);
    const page = pageWithIg ?? pages[0]!;

    const expiresAt = long.expiresIn
      ? new Date(Date.now() + long.expiresIn * 1000)
      : null;

    // Tag the new connection with the user's currently-active business
    // so multi-business users can isolate IG/FB connections per brand.
    const userRow = await db.user.findUnique({
      where: { id: user.id },
      select: { currentBusinessId: true },
    });
    const businessId = userRow?.currentBusinessId ?? null;

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
        businessId,
        provider: Provider.FACEBOOK,
        externalId: page.id,
        encryptedToken: encryptToken(page.accessToken),
        scope: "page_access_token",
        expiresAt,
      },
      update: {
        businessId,
        encryptedToken: encryptToken(page.accessToken),
        scope: "page_access_token",
        expiresAt,
        disconnectedAt: null,
      },
    });

    // If the page also has an Instagram Business account, store that too.
    if (!page.igBusinessId) {
      console.warn(
        "[meta/callback] page has no instagram_business_account — IG row not created. Most likely the user's IG account isn't linked to this Page in Meta Business Suite.",
        { pageId: page.id, pageName: page.name },
      );
    }
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
          businessId,
          provider: Provider.INSTAGRAM,
          externalId: page.igBusinessId,
          encryptedToken: encryptToken(page.accessToken),
          scope: "ig_via_page",
          expiresAt,
        },
        update: {
          businessId,
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

    // Different flash codes for different success states so the UI can
    // surface the precise next step:
    //   ok            → both FB Page + IG Business connected
    //   ok_fb_only    → FB Page connected but no IG linked at the Page
    //                   level. User needs to link IG in Meta Business
    //                   Suite, then disconnect + reconnect.
    const flash = page.igBusinessId ? "ok" : "ok_fb_only";
    const res = NextResponse.redirect(settingsRedirect(flash));
    res.cookies.delete(STATE_COOKIE);
    return res;
  } catch (err) {
    console.error("meta oauth callback failed:", err);
    return NextResponse.redirect(settingsRedirect("error_exchange"));
  }
}
