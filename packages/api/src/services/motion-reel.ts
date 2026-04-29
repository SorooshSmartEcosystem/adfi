// Motion-reel render service — thin orchestrator.
//
// Persists draft.motion state transitions (idle → rendering → ready/failed)
// and delegates the actual render work to a Next.js app-route at
// `apps/web/app/api/motion-reel/render/route.ts`. The route does the
// heavy Remotion + Chromium lifting; this service just kicks it off
// and records the result on the draft.
//
// Why split this way: Remotion's renderer + bundler pull in @rspack
// with native .node binaries. When called from inside @orb/api (which
// gets pulled into the Next bundle via transpilePackages), Vercel's
// outputFileTracing can't reliably include the runtime files.
// Putting the render call directly in an apps/web route bypasses all
// of that — the route is a leaf in Vercel's tracing graph.

import { db, type Prisma } from "@orb/db";
import type { MotionDirective } from "@orb/motion-reel/types";

// Where the actual render route lives. Resolves from env at runtime
// so dev hits localhost and prod hits the deployed URL.
function renderEndpoint(): string {
  const base =
    process.env.NEXT_PUBLIC_WEB_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    "http://localhost:3000";
  return `${base}/api/motion-reel/render`;
}

export type RenderForDraftResult = {
  draftId: string;
  mp4Url: string;
  template: string;
  durationFrames: number;
};

export async function renderForDraft(args: {
  userId: string;
  draftId: string;
  // The auth cookie header from the originating tRPC request — we
  // forward it to the internal /api/motion-reel/render route so it
  // can authenticate the user. Without this, the internal call has
  // no session.
  cookieHeader: string;
  directive: MotionDirective;
}): Promise<RenderForDraftResult> {
  const draft = await db.contentDraft.findFirst({
    where: { id: args.draftId, userId: args.userId },
    select: { id: true },
  });
  if (!draft) throw new Error(`draft ${args.draftId} not found`);

  await persistMotionState(args.draftId, {
    template: args.directive.template,
    slotValues: args.directive.content as Record<string, unknown>,
    status: "rendering",
  });

  try {
    const res = await fetch(renderEndpoint(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // Forward the user's auth cookie so the internal route can
        // verify the session.
        cookie: args.cookieHeader,
      },
      body: JSON.stringify({
        draftId: args.draftId,
        template: args.directive.template,
        content: args.directive.content,
      }),
    });

    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      throw new Error(
        errBody.error ?? `render endpoint returned ${res.status}`,
      );
    }

    const payload = (await res.json()) as {
      ok: true;
      mp4Url: string;
      durationFrames: number;
    };

    await persistMotionState(args.draftId, {
      template: args.directive.template,
      slotValues: args.directive.content as Record<string, unknown>,
      status: "ready",
      mp4Url: payload.mp4Url,
      renderedAt: new Date().toISOString(),
    });

    return {
      draftId: args.draftId,
      mp4Url: payload.mp4Url,
      template: args.directive.template,
      durationFrames: payload.durationFrames,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `[motion-reel] render failed for draft ${args.draftId}: ${msg}`,
    );
    await persistMotionState(args.draftId, {
      template: args.directive.template,
      slotValues: args.directive.content as Record<string, unknown>,
      status: "failed",
      error: msg,
    });
    throw err;
  }
}

async function persistMotionState(
  draftId: string,
  motion: Record<string, unknown>,
): Promise<void> {
  await db.contentDraft.update({
    where: { id: draftId },
    data: { motion: motion as Prisma.InputJsonValue },
  });
}
