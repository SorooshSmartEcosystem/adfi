// Motion-reel render service — thin orchestrator.
//
// Two render entry points:
//   - renderScriptForDraft  — multi-scene script (canonical)
//   - renderDirectiveForDraft — legacy single-template
//
// Both POST to apps/web/app/api/motion-reel/render which calls
// Remotion Lambda. This service just persists draft.motion state
// transitions (idle → rendering → ready/failed) and forwards the
// payload.

import { db, type Prisma } from "@orb/db";
import type { MotionDirective, VideoScript } from "@orb/motion-reel/types";

function renderEndpoint(): string {
  const base =
    process.env.NEXT_PUBLIC_WEB_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    "http://localhost:3000";
  return `${base}/api/motion-reel/render`;
}

export type RenderResult = {
  draftId: string;
  mp4Url: string;
  durationFrames: number;
};

export async function renderScriptForDraft(args: {
  userId: string;
  draftId: string;
  cookieHeader: string;
  script: VideoScript;
}): Promise<RenderResult & { totalDurationSeconds: number }> {
  const draft = await db.contentDraft.findFirst({
    where: { id: args.draftId, userId: args.userId },
    select: { id: true },
  });
  if (!draft) throw new Error(`draft ${args.draftId} not found`);

  const totalDurationSeconds = args.script.scenes.reduce(
    (s, sc) => s + (sc.duration ?? 3),
    0,
  );

  await persistMotionState(args.draftId, {
    kind: "script",
    script: args.script as unknown as Record<string, unknown>,
    durationSeconds: totalDurationSeconds,
    status: "rendering",
  });

  try {
    const res = await fetch(renderEndpoint(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: args.cookieHeader,
      },
      body: JSON.stringify({
        draftId: args.draftId,
        kind: "script",
        script: args.script,
      }),
    });

    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(errBody.error ?? `render endpoint returned ${res.status}`);
    }

    const payload = (await res.json()) as {
      ok: true;
      mp4Url: string;
      durationFrames: number;
    };

    await persistMotionState(args.draftId, {
      kind: "script",
      script: args.script as unknown as Record<string, unknown>,
      durationSeconds: totalDurationSeconds,
      status: "ready",
      mp4Url: payload.mp4Url,
      renderedAt: new Date().toISOString(),
    });

    return {
      draftId: args.draftId,
      mp4Url: payload.mp4Url,
      durationFrames: payload.durationFrames,
      totalDurationSeconds,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `[motion-reel] script render failed for draft ${args.draftId}: ${msg}`,
    );
    await persistMotionState(args.draftId, {
      kind: "script",
      script: args.script as unknown as Record<string, unknown>,
      durationSeconds: totalDurationSeconds,
      status: "failed",
      error: msg,
    });
    throw err;
  }
}

// Legacy single-template render. Same persistence pattern but writes
// the older { template, slotValues } shape into draft.motion.
export async function renderDirectiveForDraft(args: {
  userId: string;
  draftId: string;
  cookieHeader: string;
  directive: MotionDirective;
}): Promise<RenderResult> {
  const draft = await db.contentDraft.findFirst({
    where: { id: args.draftId, userId: args.userId },
    select: { id: true },
  });
  if (!draft) throw new Error(`draft ${args.draftId} not found`);

  await persistMotionState(args.draftId, {
    kind: "directive",
    template: args.directive.template,
    slotValues: args.directive.content as Record<string, unknown>,
    status: "rendering",
  });

  try {
    const res = await fetch(renderEndpoint(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: args.cookieHeader,
      },
      body: JSON.stringify({
        draftId: args.draftId,
        kind: "directive",
        template: args.directive.template,
        content: args.directive.content,
        design: "design" in args.directive ? args.directive.design : undefined,
      }),
    });

    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(errBody.error ?? `render endpoint returned ${res.status}`);
    }

    const payload = (await res.json()) as {
      ok: true;
      mp4Url: string;
      durationFrames: number;
    };

    await persistMotionState(args.draftId, {
      kind: "directive",
      template: args.directive.template,
      slotValues: args.directive.content as Record<string, unknown>,
      status: "ready",
      mp4Url: payload.mp4Url,
      renderedAt: new Date().toISOString(),
    });

    return {
      draftId: args.draftId,
      mp4Url: payload.mp4Url,
      durationFrames: payload.durationFrames,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[motion-reel] directive render failed for draft ${args.draftId}: ${msg}`);
    await persistMotionState(args.draftId, {
      kind: "directive",
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

// Re-export the original name so existing callsites don't break
// during the migration window.
export const renderForDraft = renderDirectiveForDraft;
