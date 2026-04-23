import { z } from "zod";
import { router, publicProc } from "../trpc";

export const systemRouter = router({
  health: publicProc.input(z.void()).query(() => ({
    ok: true as const,
    ts: new Date().toISOString(),
  })),
});
