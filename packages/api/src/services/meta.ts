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

// V1 OAuth scope set — drops pages_manage_posts + instagram_content_publish
// + ads_management. those get added back after App Review approves them; the
// initial connect flow has to work end-to-end before review can start. all
// scopes here are 'Ready for testing' under their respective use cases.
export const META_OAUTH_SCOPES = [
  "pages_show_list",
  "pages_manage_metadata",
  "pages_messaging",
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
