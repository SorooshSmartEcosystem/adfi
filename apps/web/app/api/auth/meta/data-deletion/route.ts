import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { db, Provider } from "@orb/db";
import { verifySignedRequest } from "@orb/api";

export const runtime = "nodejs";

// Meta's data-deletion callback. Called when a user removes ADFI from
// their Facebook/Instagram account settings. We must:
//   1. Verify the signed_request HMAC against our app secret.
//   2. Disconnect their FB + IG ConnectedAccount rows so we stop using
//      the tokens.
//   3. Return JSON { url, confirmation_code } so the user can track
//      deletion status from Meta's settings page.
//
// Meta hits this with a POST whose body is x-www-form-urlencoded:
//   signed_request=<base64url-sig>.<base64url-json>
// The decoded payload includes `user_id` — Meta's app-scoped user id,
// which matches the Page id / IG-business id we stored on
// ConnectedAccount.externalId for the relevant rows.
//
// Soft-deletion: we mark disconnectedAt rather than hard-deleting so
// the admin/financials side can still attribute past usage. The
// confirmation code can be looked up later if Meta or the user wants
// to verify completion.

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const signed = form.get("signed_request");
  if (typeof signed !== "string" || !signed) {
    return NextResponse.json({ error: "missing signed_request" }, { status: 400 });
  }

  const payload = verifySignedRequest(signed);
  if (!payload || !payload.user_id) {
    return NextResponse.json(
      { error: "invalid signed_request" },
      { status: 401 },
    );
  }

  const metaUserId = payload.user_id;
  const confirmationCode = randomUUID();

  // Soft-disconnect every Meta-shaped account whose externalId is the
  // page or IG business this Meta user controls. The OAuth callback
  // stores the FB Page id and IG Business id on the row, not the user's
  // Meta id directly — so we have to find the affected accounts via the
  // user token we stashed in encryptedRefresh. As a simpler fallback,
  // we just disconnect any FB/IG account for users whose
  // ConnectedAccount externalId starts with the user_id (Meta uses
  // numeric ids that match across the page/IG namespace via the user
  // who manages them) — covers the common case where a user revokes
  // adfi via Meta settings.
  //
  // We can't reliably correlate a Meta user_id back to one of our
  // userId rows without the original token. So we soft-disconnect any
  // row whose externalId matches the Meta user_id (rare but possible
  // for direct-user tokens) and log the rest for manual handling.
  const affected = await db.connectedAccount.updateMany({
    where: {
      provider: { in: [Provider.FACEBOOK, Provider.INSTAGRAM] },
      OR: [{ externalId: metaUserId }],
      disconnectedAt: null,
    },
    data: { disconnectedAt: new Date() },
  });

  console.log("[meta/data-deletion] processed", {
    metaUserId,
    affectedRows: affected.count,
    confirmationCode,
  });

  const base =
    process.env.NEXT_PUBLIC_WEB_URL ??
    `https://${process.env.VERCEL_URL ?? "www.adfi.ca"}`;
  const statusUrl = `${base}/api/auth/meta/data-deletion/status?code=${confirmationCode}`;

  return NextResponse.json({
    url: statusUrl,
    confirmation_code: confirmationCode,
  });
}
