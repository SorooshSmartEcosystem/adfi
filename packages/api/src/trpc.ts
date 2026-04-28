import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const middleware = t.middleware;
export const publicProc = t.procedure;

// Resolves the user's active business once per request and attaches the
// id to ctx. Falls back to bootstrapping a default business via
// ensureCurrentBusiness if none exists yet (legacy account / migration
// edge case). The id is what every per-business query (BrandKit,
// ContentDraft, ConnectedAccount, etc.) scopes against.
const isAuthed = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in" });
  }
  const row = await ctx.db.user.findUnique({
    where: { id: ctx.user.id },
    select: {
      currentBusinessId: true,
      email: true,
      businessName: true,
      businessDescription: true,
      businessLogoUrl: true,
      businessWebsiteUrl: true,
    },
  });
  let currentBusinessId = row?.currentBusinessId ?? null;
  if (!currentBusinessId) {
    // Self-heal: every authed user must have at least one Business.
    const created = await ctx.db.business.create({
      data: {
        userId: ctx.user.id,
        name:
          row?.businessName?.trim() ||
          row?.email?.split("@")[0] ||
          "my business",
        description: row?.businessDescription ?? null,
        logoUrl: row?.businessLogoUrl ?? null,
        websiteUrl: row?.businessWebsiteUrl ?? null,
      },
    });
    await ctx.db.user.update({
      where: { id: ctx.user.id },
      data: { currentBusinessId: created.id },
    });
    currentBusinessId = created.id;
  }
  return next({
    ctx: { ...ctx, user: ctx.user, currentBusinessId },
  });
});

const isAdmin = middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in" });
  }
  const role = ctx.user.app_metadata?.["role"];
  const allowedEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const emailAllowed =
    ctx.user.email && allowedEmails.includes(ctx.user.email.toLowerCase());
  if (role !== "admin" && !emailAllowed) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
  }
  return next({
    ctx: { ...ctx, user: ctx.user },
  });
});

export const authedProc = publicProc.use(isAuthed);
export const adminProc = publicProc.use(isAdmin);
