import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const middleware = t.middleware;
export const publicProc = t.procedure;

// `currentBusinessId` is already resolved once-per-request inside
// createContext (see context.ts). This middleware just verifies the
// caller is authed and runs the self-heal write when an authed user
// lands here without a Business — rare path, runs at most once per
// user lifetime. Steady-state hot path: zero extra DB queries beyond
// what createContext already paid for.
const isAuthed = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in" });
  }
  let currentBusinessId = ctx.currentBusinessId;
  if (!currentBusinessId) {
    // Self-heal: bootstrap a default Business from legacy User profile
    // fields so every authed user has at least one. Only fires once
    // per user lifetime; subsequent requests skip this entire branch.
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
