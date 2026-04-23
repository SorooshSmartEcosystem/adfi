import { appRouter, createContext } from "@orb/api";
import { headers } from "next/headers";

export async function trpcServer() {
  const h = await headers();
  const ctx = await createContext({ headers: new Headers(h) });
  return appRouter.createCaller(ctx);
}
