import { z } from "zod";
import { Provider } from "@orb/db";
import { router, authedProc } from "../trpc";
import { decryptToken } from "../services/crypto";

// Calls Meta's permission-revoke endpoint so disconnecting on adfi also
// revokes the authorization on the user's facebook account. Best-effort —
// if it fails (token expired, etc.) we still soft-disconnect locally so the
// app stops using it; the user can manually revoke at facebook.com/settings.
async function revokeMetaPermissions(token: string): Promise<void> {
  try {
    const url = new URL("https://graph.facebook.com/v19.0/me/permissions");
    url.searchParams.set("access_token", token);
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok) {
      console.warn("meta revoke failed:", res.status, await res.text());
    }
  } catch (err) {
    console.warn("meta revoke threw:", err);
  }
}

// Read + disconnect connected oauth accounts (Meta/IG/etc.). Tokens never
// leave the server — this router only exposes provider + display fields.
export const connectionsRouter = router({
  list: authedProc.input(z.void()).query(async ({ ctx }) => {
    const rows = await ctx.db.connectedAccount.findMany({
      where: { userId: ctx.user.id, disconnectedAt: null },
      select: {
        id: true,
        provider: true,
        externalId: true,
        scope: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
    return rows;
  }),

  disconnect: authedProc
    .input(z.object({ provider: z.nativeEnum(Provider) }))
    .mutation(async ({ ctx, input }) => {
      const accounts = await ctx.db.connectedAccount.findMany({
        where: {
          userId: ctx.user.id,
          provider: input.provider,
          disconnectedAt: null,
        },
      });

      // Revoke on Meta's side so the user actually loses authorization.
      // FB / IG share the same access token (we store the same page token
      // on both rows), so revoking once is enough — we still iterate in
      // case multiple rows have different tokens.
      const seen = new Set<string>();
      for (const a of accounts) {
        if (input.provider !== Provider.FACEBOOK && input.provider !== Provider.INSTAGRAM) continue;
        const token = (() => {
          try {
            return decryptToken(a.encryptedToken);
          } catch {
            return null;
          }
        })();
        if (!token || seen.has(token)) continue;
        seen.add(token);
        await revokeMetaPermissions(token);
      }

      // Soft-disconnect locally — keeps the row so admin financials can
      // still attribute past activity, but stops the app from using it.
      await ctx.db.connectedAccount.updateMany({
        where: { userId: ctx.user.id, provider: input.provider },
        data: { disconnectedAt: new Date() },
      });
      return { ok: true as const };
    }),
});
