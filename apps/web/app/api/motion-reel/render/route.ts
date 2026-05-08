// Motion-reel render endpoint — Remotion Lambda edition.
//
// Rendering runs on AWS Lambda via @remotion/lambda, not on Vercel
// serverless. Vercel + Remotion (Chromium + ffmpeg + native compositor
// binaries) was a permanent uphill battle: every "fix" revealed
// another binary that the function tracer stripped from the bundle.
// Remotion Lambda is purpose-built for this exact problem.
//
// One-time deployment (see docs/MOTION_REEL_DEPLOY.md):
//   npx remotion lambda functions deploy
//   npx remotion lambda sites create packages/motion-reel/src/index.ts \
//        --site-name=adfi-motion
//
// Env vars required on Vercel:
//   REMOTION_LAMBDA_FUNCTION_NAME   — output of `functions deploy`
//   REMOTION_LAMBDA_SITE_URL        — output of `sites create`
//   REMOTION_AWS_REGION             — same region as the function
//   REMOTION_AWS_ACCESS_KEY_ID      — IAM credentials with Lambda + S3
//   REMOTION_AWS_SECRET_ACCESS_KEY  — same
//
// This route is a thin orchestrator: validates auth, looks up the
// draft, fires `renderMediaOnLambda`, polls for completion, returns
// the resulting mp4 URL. Lambda handles everything heavy.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@orb/auth/server";
import { db } from "@orb/db";

export const runtime = "nodejs";
// Lambda renders take 10-30s typical, 60s worst case for long
// compositions. We poll while waiting; 300s gives ample headroom.
export const maxDuration = 300;

type RenderBody =
  // New script-based shape (preferred).
  | {
      draftId: string;
      kind: "script";
      script: {
        scenes: Array<Record<string, unknown>>;
        design?: Record<string, unknown>;
      };
    }
  // Legacy single-template shape (back-compat for older drafts).
  | {
      draftId: string;
      kind?: "directive";
      template: string;
      content: Record<string, unknown>;
      design?: Record<string, unknown>;
    };

const TEMPLATE_TO_COMPOSITION: Record<string, string> = {
  quote: "quote-reel",
  stat: "stat-reel",
};

function envOrThrow(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing required env var ${name}`);
  return v;
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: RenderBody;
  try {
    body = (await request.json()) as RenderBody;
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }

  if (!body.draftId) {
    return NextResponse.json({ error: "missing draftId" }, { status: 400 });
  }

  // Determine composition + inputProps based on body shape.
  // TS doesn't narrow well on the discriminated union here because
  // `kind` is optional on the legacy branch — use any-flavored picks.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = body as any;
  let compositionId: string;
  let inputProps: Record<string, unknown>;
  if (b.kind === "script" || b.script) {
    if (!b.script || !Array.isArray(b.script.scenes)) {
      return NextResponse.json(
        { error: "missing script.scenes" },
        { status: 400 },
      );
    }
    compositionId = "script-reel";
    inputProps = { script: b.script };
  } else {
    if (!b.template || !b.content) {
      return NextResponse.json(
        { error: "missing template / content" },
        { status: 400 },
      );
    }
    const cid = TEMPLATE_TO_COMPOSITION[b.template as string];
    if (!cid) {
      return NextResponse.json(
        { error: `unknown template: ${b.template}` },
        { status: 400 },
      );
    }
    compositionId = cid;
    inputProps = {
      content: b.content,
      design: b.design ?? null,
    };
  }

  const draft = await db.contentDraft.findFirst({
    where: { id: body.draftId, userId: authUser.id },
    select: { id: true, businessId: true },
  });
  if (!draft) {
    return NextResponse.json({ error: "draft not found" }, { status: 404 });
  }

  try {
    const baseTokens = await loadBrandTokens({
      userId: authUser.id,
      businessId: draft.businessId,
    });
    // Apply preset-based token overrides. dashboard-tech swaps to
    // dark-mode tokens (deep slate bg, cyan/amber accents); other
    // presets fall through unchanged today. The script's `preset`
    // field is stamped by runVideoAgent's belt-and-suspenders block.
    const { applyPresetTokens } = await import(
      "@orb/motion-reel/client"
    );
    const presetName =
      typeof inputProps.script === "object" &&
      inputProps.script &&
      "preset" in (inputProps.script as Record<string, unknown>)
        ? ((inputProps.script as Record<string, unknown>).preset as
            | string
            | undefined)
        : undefined;
    const tokens = applyPresetTokens(baseTokens, presetName);
    inputProps.tokens = tokens;

    const region = envOrThrow("REMOTION_AWS_REGION");
    const functionName = envOrThrow("REMOTION_LAMBDA_FUNCTION_NAME");
    const serveUrl = envOrThrow("REMOTION_LAMBDA_SITE_URL");

    // Lambda credentials. The @remotion/lambda SDK reads
    // REMOTION_AWS_ACCESS_KEY_ID + REMOTION_AWS_SECRET_ACCESS_KEY by
    // convention so we just need them in env — no explicit pass.
    const { renderMediaOnLambda, getRenderProgress } = await import(
      "@remotion/lambda/client"
    );

    const { renderId, bucketName } = await renderMediaOnLambda({
      region: region as Parameters<typeof renderMediaOnLambda>[0]["region"],
      functionName,
      serveUrl,
      composition: compositionId,
      inputProps,
      codec: "h264",
      privacy: "public",
      maxRetries: 1,
    });

    console.log(
      `[motion-reel] lambda render started: renderId=${renderId} bucket=${bucketName}`,
    );

    // Poll for completion. Lambda renders return progress via S3
    // metadata; we wait up to 4 minutes (renders rarely take that
    // long but cold starts + queueing can push us there).
    const start = Date.now();
    const TIMEOUT_MS = 240_000;
    const POLL_INTERVAL_MS = 2000;

    while (Date.now() - start < TIMEOUT_MS) {
      const progress = await getRenderProgress({
        renderId,
        bucketName,
        functionName,
        region: region as Parameters<typeof getRenderProgress>[0]["region"],
      });
      if (progress.fatalErrorEncountered) {
        const err = progress.errors[0];
        throw new Error(
          `lambda render fatal: ${err?.message ?? "unknown"} (frame ${err?.frame ?? "?"})`,
        );
      }
      if (progress.done) {
        const mp4Url = progress.outputFile;
        if (!mp4Url) {
          throw new Error("lambda render done but no outputFile");
        }
        console.log(
          `[motion-reel] lambda render complete: ${mp4Url} in ${Math.round(
            (Date.now() - start) / 1000,
          )}s`,
        );
        return NextResponse.json({
          ok: true,
          mp4Url,
          durationFrames: progress.framesRendered ?? 0,
        });
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }

    throw new Error(
      `lambda render timeout after ${TIMEOUT_MS / 1000}s (renderId=${renderId})`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error(
      `[motion-reel] render failed for draft ${body.draftId}: ${msg}\n${stack ?? ""}`,
    );
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// =====================================================================
// Helpers — kept inline so the route's webpack bundle is self-contained.
// =====================================================================

type StoredPalette = {
  primary: string;
  secondary: string;
  accent: string;
  ink: string;
  surface: string;
  bg: string;
};
type StoredLogos = { mark?: string; primary?: string };

async function loadBrandTokens(args: {
  userId: string;
  businessId: string | null;
}) {
  const kit = await db.brandKit.findFirst({
    where: args.businessId
      ? { businessId: args.businessId }
      : { userId: args.userId },
  });
  const businessName =
    (
      await db.user.findUnique({
        where: { id: args.userId },
        select: { businessName: true },
      })
    )?.businessName?.trim() || "your business";

  const palette = (kit?.palette ?? null) as StoredPalette | null;
  const logos = (kit?.logoTemplates ?? null) as StoredLogos | null;
  const logoMark = logos?.mark ?? logos?.primary ?? null;
  const markInner = logoMark
    ? logoMark.match(/<svg[^>]*>([\s\S]*)<\/svg>\s*$/)?.[1]?.trim()
    : undefined;

  return {
    bg: palette?.bg ?? "#FAFAF7",
    surface: palette?.surface ?? "#F2EFE5",
    surface2: "#F8F5EA",
    border: "#E5E3DB",
    ink: palette?.ink ?? "#111111",
    ink2: "#444444",
    ink3: "#666666",
    ink4: "#888888",
    alive: "#7CE896",
    aliveDark: "#3A9D5C",
    attnBg: "#FFF9ED",
    attnBorder: "#F0D98C",
    attnText: "#8A6A1E",
    markInner,
    businessName,
  };
}
