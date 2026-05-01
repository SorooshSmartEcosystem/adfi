#!/usr/bin/env node
// Copies @orb/motion-reel source files into apps/web/_motion-reel-src
// at build time. Vercel's per-function file tracer picks up only files
// statically referenced by each route, and the render route references
// motion-reel via runtime path resolution. Without this copy, the
// route's Lambda bundle ships without the package.
//
// The render route reads from this _motion-reel-src directory at
// runtime. apps/web is rooted at /var/task/apps/web on Vercel, so
// the copied files end up reliably co-located with the route.

import { mkdir, cp, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(__dirname, "../../../packages/motion-reel/src");
const destDir = resolve(__dirname, "../_motion-reel-src");

if (!existsSync(srcDir)) {
  console.error(`[copy-motion-reel] src dir not found: ${srcDir}`);
  process.exit(1);
}

await mkdir(destDir, { recursive: true });
await cp(srcDir, destDir, { recursive: true });

// Sanity: list what got copied so the build log shows the result.
async function listFiles(dir, depth = 0) {
  if (depth > 3) return;
  const entries = await readdir(dir);
  for (const e of entries) {
    const p = join(dir, e);
    const s = await stat(p);
    console.log(`  ${"  ".repeat(depth)}${e}${s.isDirectory() ? "/" : ""}`);
    if (s.isDirectory()) await listFiles(p, depth + 1);
  }
}
console.log(`[copy-motion-reel] copied ${srcDir} → ${destDir}`);
await listFiles(destDir).catch((err) => {
  console.warn("[copy-motion-reel] listing failed:", err);
});
