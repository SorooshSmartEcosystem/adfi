// Motion-reel render service.
//
// Wraps Remotion's renderMedia() — given a ContentDraft, picks a
// composition + slot values, renders a 9:16 mp4, uploads to Supabase
// Storage (`business-assets/<userId>/motion/<draftId>-<ts>.mp4`), and
// persists the resulting URL on `ContentDraft.motion`.
//
// LOCAL DEV: works as-is. Remotion auto-downloads its Headless Shell
// to ~/.cache/remotion on first call.
//
// PRODUCTION (Vercel): requires @sparticuz/chromium wired into the
// renderer's `chromiumOptions`. NOT YET DONE — Phase 2.5. Until then
// the mutation will fail with a binary-not-found error on prod cold
// starts. Locally it works end-to-end.
//
// Cost per render: ~$0 in external API spend (no Anthropic, no
// Replicate). Just compute time. ~10-30s wall time per 8-second clip
// on a 2GB function.

import { db, type Prisma } from "@orb/db";
import { createServiceRoleClient } from "@orb/auth/server";

// Remotion is loaded via opaque dynamic require that webpack can't
// trace. @remotion/bundler transitively pulls in @rspack with native
// .node binaries Webpack chokes on; even `await import("@remotion/...")`
// gets resolved by webpack's static analyzer and trips the error. The
// `Function('return import(...)')` wrapper hides the call from the
// bundler entirely — Node executes it at runtime, webpack never sees it.
const dynImport = <T = unknown>(spec: string): Promise<T> =>
  Function("spec", "return import(spec)")(spec) as Promise<T>;
import { readFile, unlink } from "node:fs/promises";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
// Type-only import — the package's main entry imports React .tsx
// files which @orb/api's tsconfig deliberately doesn't compile.
// The types/ subpath has no React deps.
import type { MotionDirective, BrandTokens } from "@orb/motion-reel/types";

// ============================================================
// Bundle cache — bundling Remotion is slow (compiles all
// compositions through esbuild). We do it once per process and
// reuse the serve URL across renders.
// ============================================================

let cachedBundleUrl: string | null = null;

async function getServeUrl(): Promise<string> {
  if (cachedBundleUrl) return cachedBundleUrl;

  // Webpack-opaque import — see dynImport comment above.
  const { bundle } = await dynImport<typeof import("@remotion/bundler")>(
    "@remotion/bundler",
  );

  // Resolve the @orb/motion-reel package's index.ts. We can't use
  // require.resolve in ESM, so walk from this file → ../../../motion-reel.
  const here = typeof __dirname !== "undefined"
    ? __dirname
    : dirname(fileURLToPath(import.meta.url));
  // packages/api/src/services → packages/motion-reel/src/index.ts
  const entryPath = join(here, "..", "..", "..", "motion-reel", "src", "index.ts");

  const url = await bundle({
    entryPoint: entryPath,
    // No webpack overrides for now. Remotion's defaults handle .tsx +
    // jsx automatically.
  });
  cachedBundleUrl = url;
  return url;
}

// ============================================================
// Brand tokens — pull the BrandKit's palette + mark for the active
// business and shape into the BrandTokens contract.
// ============================================================

async function loadBrandTokens(args: {
  userId: string;
  businessId: string | null;
}): Promise<BrandTokens> {
  const kit = await db.brandKit.findFirst({
    where: args.businessId
      ? { businessId: args.businessId }
      : { userId: args.userId },
  });
  const businessName = (await db.user.findUnique({
    where: { id: args.userId },
    select: { businessName: true },
  }))?.businessName?.trim() || "your business";

  // Parse palette JSON. Falls back to ADFI defaults if the kit hasn't
  // been generated yet — the resulting reel still looks sane.
  type StoredPalette = {
    primary: string; secondary: string; accent: string;
    ink: string; surface: string; bg: string;
  };
  const palette = (kit?.palette ?? null) as StoredPalette | null;
  type StoredLogos = { mark?: string; primary?: string };
  const logos = (kit?.logoTemplates ?? null) as StoredLogos | null;
  const logoMark = logos?.mark ?? logos?.primary ?? null;

  // Strip outer <svg> wrapper from the mark — BrandMark expects inner.
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

// ============================================================
// Render orchestrator
// ============================================================

export type RenderForDraftResult = {
  draftId: string;
  mp4Url: string;
  template: string;
  durationFrames: number;
};

// Compose-id mapping. Adding a new composition: register in
// motion-reel/src/Root.tsx, add the template→id mapping here, and
// extend MotionDirective in motion-reel/src/types.ts.
const TEMPLATE_TO_COMPOSITION: Record<MotionDirective["template"], string> = {
  "quote": "quote-reel",
  "stat": "stat-reel",
  // pending Phase 2:
  "list": "list-reel",
  "product-reveal": "product-reveal",
  "carousel-as-reel": "carousel-as-reel",
};

export async function renderForDraft(args: {
  userId: string;
  draftId: string;
  // Caller's chosen template + slot values. The UI button picks a
  // sensible default per content shape; advanced UI may surface a
  // template picker later.
  directive: MotionDirective;
}): Promise<RenderForDraftResult> {
  const draft = await db.contentDraft.findFirst({
    where: { id: args.draftId, userId: args.userId },
    select: { id: true, businessId: true },
  });
  if (!draft) throw new Error(`draft ${args.draftId} not found`);

  // Mark as rendering BEFORE the heavy work. UI polls this and shows
  // a spinner; on failure we'll flip to status='failed' with error.
  await persistMotionState(args.draftId, {
    template: args.directive.template,
    slotValues: args.directive.content as Record<string, unknown>,
    status: "rendering",
  });

  try {
    const tokens = await loadBrandTokens({
      userId: args.userId,
      businessId: draft.businessId,
    });

    const compositionId = TEMPLATE_TO_COMPOSITION[args.directive.template];
    if (!compositionId) {
      throw new Error(`unknown motion template: ${args.directive.template}`);
    }

    // Webpack-opaque import — see dynImport comment above.
    const { renderMedia, selectComposition } =
      await dynImport<typeof import("@remotion/renderer")>("@remotion/renderer");

    const serveUrl = await getServeUrl();
    const composition = await selectComposition({
      serveUrl,
      id: compositionId,
      inputProps: { tokens, content: args.directive.content },
    });

    // Render to a temp file, then upload + clean up.
    const outFile = join(
      tmpdir(),
      `motion-${args.draftId}-${Date.now()}.mp4`,
    );
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: outFile,
      inputProps: { tokens, content: args.directive.content },
      // Reasonable defaults. Tune later if quality needs adjustment.
      crf: 22,
      pixelFormat: "yuv420p",
    });

    const mp4Url = await uploadToStorage({
      userId: args.userId,
      draftId: args.draftId,
      filePath: outFile,
    });

    // Best-effort cleanup of the temp file.
    await unlink(outFile).catch(() => undefined);

    await persistMotionState(args.draftId, {
      template: args.directive.template,
      slotValues: args.directive.content as Record<string, unknown>,
      status: "ready",
      mp4Url,
      renderedAt: new Date().toISOString(),
    });

    return {
      draftId: args.draftId,
      mp4Url,
      template: args.directive.template,
      durationFrames: composition.durationInFrames,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
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
  if (error) throw new Error(`motion-reel storage upload failed: ${error.message}`);
  const { data } = admin.storage.from("business-assets").getPublicUrl(path);
  return data.publicUrl;
}
