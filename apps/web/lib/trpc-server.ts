import { appRouter, createContext } from "@orb/api";
import { headers } from "next/headers";
import { cache } from "react";

// React's `cache` dedupes per-request: if two server components ask for the
// caller in the same render, we build it once. This pairs with the cached
// helpers below — a single render that calls `getDashUserAndHome()` twice
// only hits Postgres once.
export const trpcServer = cache(async () => {
  const h = await headers();
  const ctx = await createContext({ headers: new Headers(h) });
  return appRouter.createCaller(ctx);
});

// Common dash-layout payload — used by /(dash)/layout.tsx and the page
// it wraps. Cached so we don't run the same getHomeData query twice on a
// single navigation.
export const getDashUserAndHome = cache(async () => {
  const trpc = await trpcServer();
  const [user, home] = await Promise.all([
    trpc.user.me(),
    trpc.user.getHomeData(),
  ]);
  return { user, home };
});
