import { TRPCError } from "@trpc/server";

export const OrbError = {
  UNAUTHENTICATED: new TRPCError({
    code: "UNAUTHORIZED",
    message: "Please sign in",
  }),
  FORBIDDEN: new TRPCError({
    code: "FORBIDDEN",
    message: "You don't have access to this",
  }),
  NOT_FOUND: (what: string) =>
    new TRPCError({ code: "NOT_FOUND", message: `${what} not found` }),
  RATE_LIMITED: new TRPCError({
    code: "TOO_MANY_REQUESTS",
    message: "Slow down — try again in a moment",
  }),
  RATE_LIMIT: (detail: string) =>
    new TRPCError({ code: "TOO_MANY_REQUESTS", message: detail }),
  TRIAL_EXPIRED: new TRPCError({
    code: "FORBIDDEN",
    message: "Your trial has ended. Add billing to continue.",
  }),
  PLAN_LIMIT: (feature: string) =>
    new TRPCError({
      code: "FORBIDDEN",
      message: `${feature} requires a higher plan`,
    }),
  EXTERNAL_API: (service: string) =>
    new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `${service} is having issues — I'll retry`,
    }),
  VALIDATION: (detail: string) =>
    new TRPCError({ code: "BAD_REQUEST", message: detail }),
};
