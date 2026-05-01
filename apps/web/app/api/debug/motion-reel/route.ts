import { NextResponse } from "next/server";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

// Diagnostic endpoint — returns the filesystem layout Vercel produced
// for the motion-reel render route, so we can see why
// resolveMotionReelEntry can't find the package. Public-readable
// metadata only (no auth, no secrets).

export const runtime = "nodejs";

function safeReadDir(p: string): string[] | string {
  try {
    if (!existsSync(p)) return "(missing)";
    return readdirSync(p).slice(0, 50);
  } catch (err) {
    return `(error: ${err instanceof Error ? err.message : String(err)})`;
  }
}

export function GET() {
  const cwd = process.cwd();
  const candidates = [
    resolve(cwd, "node_modules/@orb/motion-reel/src/index.ts"),
    resolve(cwd, "node_modules/@orb/motion-reel/dist/index.js"),
    resolve(cwd, "packages/motion-reel/src/index.ts"),
    resolve(cwd, "../../packages/motion-reel/src/index.ts"),
    "/var/task/packages/motion-reel/src/index.ts",
    "/var/task/node_modules/@orb/motion-reel/src/index.ts",
    "/var/task/apps/web/node_modules/@orb/motion-reel/src/index.ts",
  ];

  let createRequireResolved: string | null = null;
  let createRequireError: string | null = null;
  try {
    const r = createRequire(import.meta.url);
    createRequireResolved = r.resolve("@orb/motion-reel");
  } catch (err) {
    createRequireError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    cwd,
    importMetaUrl: import.meta.url,
    contents: {
      cwd: safeReadDir(cwd),
      cwdNodeModules: safeReadDir(resolve(cwd, "node_modules")),
      cwdNodeModulesOrb: safeReadDir(resolve(cwd, "node_modules/@orb")),
      cwdPackages: safeReadDir(resolve(cwd, "packages")),
      varTask: safeReadDir("/var/task"),
      varTaskNodeModules: safeReadDir("/var/task/node_modules"),
      varTaskNodeModulesOrb: safeReadDir("/var/task/node_modules/@orb"),
      varTaskPackages: safeReadDir("/var/task/packages"),
    },
    candidateProbes: candidates.map((p) => ({
      path: p,
      exists: existsSync(p),
    })),
    createRequire: {
      resolved: createRequireResolved,
      error: createRequireError,
    },
  });
}
