import { z } from "zod";
import { AppointmentStatus } from "@orb/db";
import { router, authedProc } from "../trpc";
import { OrbError } from "../errors";

export const appointmentsRouter = router({
  list: authedProc
    .input(
      z.object({
        from: z.date().optional(),
        to: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.appointment.findMany({
        where: {
          userId: ctx.user.id,
          ...(input.from || input.to
            ? {
                scheduledFor: {
                  ...(input.from && { gte: input.from }),
                  ...(input.to && { lte: input.to }),
                },
              }
            : {}),
        },
        orderBy: { scheduledFor: "asc" },
      });
    }),

  get: authedProc
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const appt = await ctx.db.appointment.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        include: { call: true },
      });
      if (!appt) throw OrbError.NOT_FOUND("appointment");
      return appt;
    }),

  cancel: authedProc
    .input(
      z.object({
        id: z.string().uuid(),
        reason: z.string().max(300).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appt = await ctx.db.appointment.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!appt) throw OrbError.NOT_FOUND("appointment");
      return ctx.db.appointment.update({
        where: { id: appt.id },
        data: {
          status: AppointmentStatus.CANCELED,
          notes: input.reason
            ? `${appt.notes ?? ""}\n[Canceled] ${input.reason}`.trim()
            : appt.notes,
        },
      });
    }),

  reschedule: authedProc
    .input(
      z.object({
        id: z.string().uuid(),
        newTime: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appt = await ctx.db.appointment.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!appt) throw OrbError.NOT_FOUND("appointment");
      return ctx.db.appointment.update({
        where: { id: appt.id },
        data: { scheduledFor: input.newTime },
      });
    }),

  // Booking rules live in a preferences JSON that doesn't exist yet —
  // coming with the Signal scheduling flow. Stubs return/throw for now.
  getBookingRules: authedProc.input(z.void()).query(() => {
    return {
      allowedDays: [1, 2, 3, 4, 5] as const,
      startHour: 9,
      endHour: 17,
      minNoticeHours: 24,
    };
  }),

  updateBookingRules: authedProc
    .input(z.object({}).passthrough())
    .mutation(() => {
      throw OrbError.VALIDATION(
        "Booking rules editing isn't live yet — coming with scheduling",
      );
    }),
});
