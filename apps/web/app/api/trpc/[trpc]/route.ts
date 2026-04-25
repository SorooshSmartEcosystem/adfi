import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createContext } from "@orb/api";

// Anthropic calls inside agent.runNow / content.generate / content.draftPlanItem
// can take 30-60s each, and we sometimes chain them (Echo with A/B variants
// = 2 calls; planner = 1 call). Default Vercel function timeout is 10s on
// Hobby and 60s on Pro — too tight for chained agent runs. Bump to 300s
// (Pro Functions max). Hobby plans cap at 60s regardless.
export const maxDuration = 300;
export const runtime = "nodejs";

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: ({ req }) => createContext({ headers: req.headers }),
  });
}

export { handler as GET, handler as POST };
