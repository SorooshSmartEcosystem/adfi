// Motion-reel render endpoint.
//
// Why this lives in apps/web instead of going through tRPC:
//   - Remotion's renderer + bundler pull in @rspack with native .node
//     binaries that webpack chokes on. Hiding the imports behind
//     opaque dynamic-require/import patterns keeps the build green
//     but trips Vercel's outputFileTracing — the package files don't
//     end up in the Lambda.
//   - A direct Next.js app-route file is what Vercel's tracer
//     handles best. Imports here are visible to the tracer; the
//     route's bundle gets all the files it needs at deploy time.
//
// The tRPC mutation in @orb/api wraps a fetch() to this endpoint
// after authenticating + persisting status='rendering' on the draft.
// This file does the heavy work, returns the mp4 URL, the tRPC
// caller persists the final ready/failed state.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, createServiceRoleClient } from "@orb/auth/server";
import { db } from "@orb/db";
import { readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";

// We need real Node — Edge can't run Remotion's compositor.
export const runtime = "nodejs";
// Render can take 30-60s on cold start (Chromium + Remotion bundle).
export const maxDuration = 300;

type RenderBody = {
  draftId: string;
  template: string; // 'quote' | 'stat' | etc.
  content: Record<string, unknown>;
};

const TEMPLATE_TO_COMPOSITION: Record<string, string> = {
  quote: "quote-reel",
  stat: "stat-reel",
};

export async function POST(request: NextRequest) {
  // Auth — same pattern as the other API routes.
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

  if (!body.draftId || !body.template || !body.content) {
    return NextResponse.json(
      { error: "missing draftId / template / content" },
      { status: 400 },
    );
  }

  // Verify the draft belongs to this user before rendering.
  const draft = await db.contentDraft.findFirst({
    where: { id: body.draftId, userId: authUser.id },
    select: { id: true, businessId: true },
  });
  if (!draft) {
    return NextResponse.json({ error: "draft not found" }, { status: 404 });
  }

  const compositionId = TEMPLATE_TO_COMPOSITION[body.template];
  if (!compositionId) {
    return NextResponse.json(
      { error: `unknown template: ${body.template}` },
      { status: 400 },
    );
  }

  try {
    const tokens = await loadBrandTokens({
      userId: authUser.id,
      businessId: draft.businessId,
    });

    // Imports are visible to webpack here, but @rspack's native
    // binaries are externalized via next.config.mjs serverExternalPackages
    // so the build doesn't try to bundle them.
    const { bundle } = await import("@remotion/bundler");
    const { renderMedia, selectComposition } = await import(
      "@remotion/renderer"
    );

    const isServerless = !!(
      process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.AWS_EXECUTION_ENV
    );
    let executablePath: string | undefined;
    if (isServerless) {
      // @sparticuz/chromium's executablePath uses `this.graphics` and
      // similar instance state, so we MUST call it as a bound method
      // — destructuring `const fn = sp.executablePath` then `fn()`
      // throws "Cannot read properties of undefined (reading
      // 'graphics')" because `this` is lost. Calling
      // instance.executablePath() preserves `this` so the getter
      // resolves correctly.
      //
      // We don't try to set instance.graphics — it's a read-only
      // getter on the Chromium class. The default value is fine for
      // our SVG/CSS compositions (no WebGL).
      const sparticuz = (await import("@sparticuz/chromium")) as unknown as {
        default?: {
          executablePath: () => Promise<string>;
        };
        executablePath?: () => Promise<string>;
      };
      const instance = sparticuz.default ?? sparticuz;
      if (!instance || typeof instance.executablePath !== "function") {
        throw new Error("@sparticuz/chromium has no executablePath export");
      }
      executablePath = await instance.executablePath();
    }

    // Resolve the @orb/motion-reel package's entry point. createRequire
    // gives us a CJS-style resolver that works regardless of how Next
    // compiled this file.
    const r = createRequire(import.meta.url);
    const entryPath = r.resolve("@orb/motion-reel");

    const serveUrl = await bundle({ entryPoint: entryPath });

    const composition = await selectComposition({
      serveUrl,
      id: compositionId,
      inputProps: { tokens, content: body.content },
    });

    const outFile = join(
      tmpdir(),
      `motion-${body.draftId}-${Date.now()}.mp4`,
    );
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: outFile,
      inputProps: { tokens, content: body.content },
      crf: 22,
      pixelFormat: "yuv420p",
      ...(executablePath ? { browserExecutable: executablePath } : {}),
    });

    const mp4Url = await uploadToStorage({
      userId: authUser.id,
      draftId: body.draftId,
      filePath: outFile,
    });
    await unlink(outFile).catch(() => undefined);

    return NextResponse.json({
      ok: true,
      mp4Url,
      durationFrames: composition.durationInFrames,
    });
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

async function uploadToStorage(args: {
  userId: string;
  draftId: string;
  filePath: string;
}): Promise<string> {
  const bytes = await readFile(args.filePath);
  const path = `${args.userId}/motion/${args.draftId}-${Date.now()}.mp4`;
  const admin = createServiceRoleClient();
  const { error } = await admin.storage
    .from("business-assets")
    .upload(path, bytes, {
      contentType: "video/mp4",
      upsert: true,
    });
  if (error) {
    throw new Error(`motion-reel storage upload failed: ${error.message}`);
  }
  const { data } = admin.storage.from("business-assets").getPublicUrl(path);
  return data.publicUrl;
}
