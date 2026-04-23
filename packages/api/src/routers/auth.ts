import { z } from "zod";
import { router, publicProc } from "../trpc";
import { OrbError } from "../errors";

// Deviates slightly from API.md's challengeId pattern — Supabase's OTP flow
// verifies by phone/email + token directly (no opaque challenge handle).
// Keeping the router surface Supabase-native; UI layer can still wrap it
// with a client-side "challenge" state if needed.

export const authRouter = router({
  requestOtp: publicProc
    .input(
      z
        .object({
          phone: z.string().min(6).optional(),
          email: z.string().email().optional(),
        })
        .refine((v) => v.phone || v.email, {
          message: "phone or email required",
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = input.email
        ? await ctx.supabase.auth.signInWithOtp({ email: input.email })
        : await ctx.supabase.auth.signInWithOtp({
            phone: input.phone as string,
          });
      if (error) throw OrbError.EXTERNAL_API("Supabase Auth");
      return { sent: true as const };
    }),

  verifyOtp: publicProc
    .input(
      z
        .object({
          phone: z.string().optional(),
          email: z.string().email().optional(),
          code: z.string().min(4).max(10),
        })
        .refine((v) => v.phone || v.email, {
          message: "phone or email required",
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = input.email
        ? await ctx.supabase.auth.verifyOtp({
            email: input.email,
            token: input.code,
            type: "email",
          })
        : await ctx.supabase.auth.verifyOtp({
            phone: input.phone as string,
            token: input.code,
            type: "sms",
          });
      if (error || !data.session) throw OrbError.UNAUTHENTICATED;
      return { session: data.session };
    }),

  refreshSession: publicProc.input(z.void()).mutation(async ({ ctx }) => {
    const { data, error } = await ctx.supabase.auth.refreshSession();
    if (error || !data.session) throw OrbError.UNAUTHENTICATED;
    return { session: data.session };
  }),

  logout: publicProc.input(z.void()).mutation(async ({ ctx }) => {
    await ctx.supabase.auth.signOut();
    return { success: true as const };
  }),
});
