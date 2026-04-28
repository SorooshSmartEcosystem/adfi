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
// id to ctx. The hot path is one tiny query (just currentBusinessId);
// only when that field is null do we run the self-heal flow that
// creates a default Business — so 99% of requests pay one indexed
// PK lookup, not the wider profile fetch.
const isAuthed = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in" });
  }
  const row = await ctx.db.user.findUnique({
    where: { id: ctx.user.id },
    select: { currentBusinessId: true },
  });
  let currentBusinessId = row?.currentBusinessId ?? null;
  if (!currentBusinessId) {
    // Self-heal: every authed user must have at least one Business.
    // Only runs the wider profile fetch when we actually need to
    // bootstrap — keeps the steady-state hot path fast.
    const profile = await ctx.db.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        email: true,
        businessName: true,
        businessDescription: true,
        businessLogoUrl: true,
        businessWebsiteUrl: true,
      },
    });
    const created = await ctx.db.business.create({
      data: {
        userId: ctx.user.id,
        name:
          profile?.businessName?.trim() ||
          profile?.email?.split("@")[0] ||
          "my business",
        description: profile?.businessDescription ?? null,
        logoUrl: profile?.businessLogoUrl ?? null,
        websiteUrl: profile?.businessWebsiteUrl ?? null,
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
