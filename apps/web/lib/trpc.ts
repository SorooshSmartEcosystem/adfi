import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@orb/api";

export const trpc = createTRPCReact<AppRouter>();
