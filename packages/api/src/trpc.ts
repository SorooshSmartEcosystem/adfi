import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const middleware = t.middleware;
export const publicProc = t.procedure;

const isAuthed = middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in" });
  }
  return next({
    ctx: { ...ctx, user: ctx.user },
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
