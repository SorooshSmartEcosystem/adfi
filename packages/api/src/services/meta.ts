// Meta Graph API client. Just enough surface for the v1 connect flow:
//
//   - exchangeCodeForToken    : OAuth code → short-lived token
//   - extendToken             : short-lived → long-lived (60 day)
//   - listPages               : pages the user manages (each carries its own
//                               page access token + optional ig business id)
//   - subscribePageWebhook    : subscribe a page to message events
//   - sendMessengerReply      : POST to graph for a Messenger response
//
// Token storage handled by the caller via services/crypto.ts. We never log
// access tokens.

import { createHmac, timingSafeEqual } from "node:crypto";

const GRAPH = "https://graph.facebook.com/v19.0";

export type MetaPage = {
  id: string;
  name: string;
  accessToken: string;
  category: string | null;
  igBusinessId: string | null;
};

function appId(): string {
  const v = process.env.META_APP_ID;
  if (!v) throw new Error("META_APP_ID must be set");
  return v;
}
function appSecret(): string {
  const v = process.env.META_APP_SECRET;
  if (!v) throw new Error("META_APP_SECRET must be set");
  return v;
}

// V1 OAuth scope set, aligned with Meta's "Instagram API with Facebook
// Login" use case. Meta is mid-transition: the App dashboard's
// "Permissions and Features" page lists the new `instagram_business_*`
// names, but the OAuth Login Dialog only validates the LEGACY
// `instagram_*` names. Submitting the new names returns:
//   "Invalid Scopes: instagram_business_basic, ..."
// Toggle the new-name permissions ON in the dashboard, but request the
// legacy names here. (When Meta finishes the migration we flip back.)
//
// We do NOT request `pages_messaging` or `pages_manage_metadata` — those
// belong to the deprecated standalone Messenger Platform use case which
// isn't exposed for new apps; IG DMs work through
// `instagram_manage_messages` and Page webhooks subscribe with the page
// access token directly (no app-level scope needed).
// `instagram_content_publish` + `ads_management` get added back after
// App Review approves them.
export const META_OAUTH_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_manage_messages",
  "business_management",
] as const;

export function buildAuthorizeUrl(args: {
  redirectUri: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    client_id: appId(),
    redirect_uri: args.redirectUri,
    state: args.state,
    response_type: "code",
    scope: META_OAUTH_SCOPES.join(","),
  });
  return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
}

export async function exchangeCodeForToken(args: {
  code: string;
  redirectUri: string;
}): Promise<{ accessToken: string; expiresIn: number | null }> {
  const url = new URL(`${GRAPH}/oauth/access_token`);
  url.searchParams.set("client_id", appId());
  url.searchParams.set("client_secret", appSecret());
  url.searchParams.set("redirect_uri", args.redirectUri);
  url.searchParams.set("code", args.code);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`meta token exchange ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    expires_in?: number;
  };
  return { accessToken: data.access_token, expiresIn: data.expires_in ?? null };
}

export async function extendToken(shortLived: string): Promise<{
  accessToken: string;
  expiresIn: number | null;
}> {
  const url = new URL(`${GRAPH}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId());
  url.searchParams.set("client_secret", appSecret());
  url.searchParams.set("fb_exchange_token", shortLived);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`meta extend token ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    expires_in?: number;
  };
  return { accessToken: data.access_token, expiresIn: data.expires_in ?? null };
}

export async function listPages(userToken: string): Promise<MetaPage[]> {
  // Each page carries its own access token. We also fetch instagram_business_account
  // in the same call so we don't N+1 for IG account lookups.
  const url = new URL(`${GRAPH}/me/accounts`);
  url.searchParams.set(
    "fields",
    "id,name,category,access_token,instagram_business_account{id}",
  );
  url.searchParams.set("access_token", userToken);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`meta list pages ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    data: Array<{
      id: string;
      name: string;
      category?: string;
      access_token: string;
      instagram_business_account?: { id: string };
    }>;
  };
  return data.data.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category ?? null,
    accessToken: p.access_token,
    igBusinessId: p.instagram_business_account?.id ?? null,
  }));
}

export async function subscribePageWebhook(args: {
  pageId: string;
  pageAccessToken: string;
  fields?: string[];
}): Promise<void> {
  const url = new URL(`${GRAPH}/${args.pageId}/subscribed_apps`);
  url.searchParams.set(
    "subscribed_fields",
    (args.fields ?? ["messages", "messaging_postbacks", "feed"]).join(","),
  );
  url.searchParams.set("access_token", args.pageAccessToken);
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    throw new Error(
      `meta subscribe webhook ${res.status}: ${await res.text()}`,
    );
  }
}

// Fetches the display name + profile picture for a Messenger PSID or
// Instagram-scoped user id. Best-effort: returns null if the lookup fails
// (token expired, user blocked the page, etc.) so the caller can fall
// back to the raw id.
export async function getMessengerProfile(args: {
  userId: string;
  pageAccessToken: string;
  channel: "MESSENGER" | "INSTAGRAM_DM";
}): Promise<{ name: string | null; avatarUrl: string | null } | null> {
  const fields =
    args.channel === "INSTAGRAM_DM"
      ? "name,profile_pic"
      : "first_name,last_name,profile_pic";
  const url = new URL(`${GRAPH}/${args.userId}`);
  url.searchParams.set("fields", fields);
  url.searchParams.set("access_token", args.pageAccessToken);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(
        `meta profile fetch ${res.status} for ${args.userId}: ${(await res.text()).slice(0, 200)}`,
      );
      return null;
    }
    const data = (await res.json()) as {
      name?: string;
      first_name?: string;
      last_name?: string;
      profile_pic?: string;
    };
    const fullName =
      data.name ??
      [data.first_name, data.last_name].filter(Boolean).join(" ");
    return {
      name: fullName && fullName.length > 0 ? fullName : null,
      avatarUrl: data.profile_pic ?? null,
    };
  } catch (err) {
    console.warn("meta profile fetch threw:", err);
    return null;
  }
}

export async function sendMessengerReply(args: {
  pageAccessToken: string;
  recipientPsid: string;
  text: string;
}): Promise<void> {
  const url = new URL(`${GRAPH}/me/messages`);
  url.searchParams.set("access_token", args.pageAccessToken);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: args.recipientPsid },
      messaging_type: "RESPONSE",
      message: { text: args.text },
    }),
  });
  if (!res.ok) {
    throw new Error(`messenger send ${res.status}: ${await res.text()}`);
  }
}

// Decodes Meta's `signed_request` parameter (sent on data deletion
// callbacks and a few legacy OAuth flows). Format:
//   <base64url-hmac>.<base64url-json-payload>
// HMAC is SHA256 of the encoded payload signed with the app secret.
// Returns the decoded payload only if the signature verifies.
export function verifySignedRequest(
  signedRequest: string,
): { user_id?: string; algorithm?: string; issued_at?: number } | null {
  const dot = signedRequest.indexOf(".");
  if (dot < 0) return null;
  const encodedSig = signedRequest.slice(0, dot);
  const encodedPayload = signedRequest.slice(dot + 1);

  // base64url → standard base64
  const fromB64Url = (s: string): Buffer => {
    const pad = s.length % 4;
    const padded = pad === 0 ? s : s + "=".repeat(4 - pad);
    return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  };

  let providedSig: Buffer;
  try {
    providedSig = fromB64Url(encodedSig);
  } catch {
    return null;
  }

  const expectedSig = createHmac("sha256", appSecret())
    .update(encodedPayload)
    .digest();

  if (
    providedSig.length !== expectedSig.length ||
    !timingSafeEqual(providedSig, expectedSig)
  ) {
    return null;
  }

  try {
    const json = fromB64Url(encodedPayload).toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Verifies the X-Hub-Signature-256 header on inbound webhook POSTs so we
// only process events Meta actually signed with our app secret.
export function verifyWebhookSignature(args: {
  rawBody: string;
  signatureHeader: string | null;
}): boolean {
  if (!args.signatureHeader) return false;
  const expected =
    "sha256=" +
    createHmac("sha256", appSecret()).update(args.rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(args.signatureHeader);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
