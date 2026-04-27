import { router } from "../trpc";
import { systemRouter } from "./system";
import { authRouter } from "./auth";
import { onboardingRouter } from "./onboarding";
import { userRouter } from "./user";
import { contentRouter } from "./content";
import { callsRouter } from "./calls";
import { appointmentsRouter } from "./appointments";
import { messagingRouter } from "./messaging";
import { competitorsRouter } from "./competitors";
import { insightsRouter } from "./insights";
import { billingRouter } from "./billing";
import { adminRouter } from "./admin";
import { agentRouter } from "./agent";
import { subscribersRouter } from "./subscribers";
import { connectionsRouter } from "./connections";
import { brandKitRouter } from "./brand-kit";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  onboarding: onboardingRouter,
  user: userRouter,
  content: contentRouter,
  calls: callsRouter,
  appointments: appointmentsRouter,
  messaging: messagingRouter,
  competitors: competitorsRouter,
  insights: insightsRouter,
  billing: billingRouter,
  admin: adminRouter,
  agent: agentRouter,
  subscribers: subscribersRouter,
  connections: connectionsRouter,
  brandKit: brandKitRouter,
});

export type AppRouter = typeof appRouter;
