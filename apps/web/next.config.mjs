import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@orb/api", "@orb/auth", "@orb/db", "@orb/ui"],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },

  // Externalize Prisma — load at runtime from node_modules instead of bundling.
  // This avoids the need to rewrite its internal dynamic loader for the query
  // engine binary path.
  //
  // Same treatment for the Remotion stack: @remotion/bundler pulls in @rspack
  // which ships native .node binaries Webpack can't parse. The renderer also
  // spawns ffmpeg + Chromium at runtime, neither of which webpack should
  // touch. They run only inside the motion-reel render service (server-side
  // tRPC route) so externalization is safe. @sparticuz/chromium provides the
  // serverless Chromium binary on Vercel.
  serverExternalPackages: [
    "@prisma/client",
    ".prisma/client",
    "@remotion/bundler",
    "@remotion/renderer",
    "@remotion/compositor-darwin-arm64",
    "@remotion/compositor-darwin-x64",
    "@remotion/compositor-linux-x64-gnu",
    "@remotion/compositor-linux-x64-musl",
    "@remotion/compositor-linux-arm64-gnu",
    "@remotion/compositor-linux-arm64-musl",
    "@remotion/compositor-win32-x64-msvc",
    "@rspack/core",
    "@rspack/binding",
    "@sparticuz/chromium",
    "esbuild",
  ],

  // Hosts we proxy images from. Required for next/image — without this it
  // 400s on remote sources.
  images: {
    remotePatterns: [
      // Replicate-generated draft photos (Echo + Flux Schnell).
      { protocol: "https", hostname: "replicate.delivery" },
      { protocol: "https", hostname: "**.replicate.delivery" },
      // Meta-served avatars (messenger profile pics).
      { protocol: "https", hostname: "**.fbcdn.net" },
      { protocol: "https", hostname: "**.cdninstagram.com" },
      // Supabase Storage — used for business logos and onboarding uploads.
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },

  // Monorepo root — tells Next's file tracer where the project actually starts
  // (Vercel mounts this at /var/task at runtime).
  outputFileTracingRoot: path.join(__dirname, "../../"),

  // Include the generated Prisma client + the rhel query-engine binary in the
  // deployed bundle. Paths are relative to outputFileTracingRoot.
  //
  // Same explicit-include trick for the Remotion + sparticuz stack: their
  // package files are statically invisible to Vercel's tracer because the
  // motion-reel service loads them via Function('return require') to dodge
  // webpack's bundle analyzer. Without these patterns the Lambda function
  // would deploy without the actual JS files for @remotion/renderer etc.
  outputFileTracingIncludes: {
    // Apply to every route (the more-specific motion-reel route also
    // matches, but using "/**/*" guarantees nothing is missed for
    // shared chunks).
    "/**/*": [
      "node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**/*",
      "node_modules/.pnpm/@prisma+client@*/node_modules/@prisma/client/**/*",
      "node_modules/.pnpm/@prisma+engines@*/node_modules/@prisma/engines/**/*",
      // Remotion + sparticuz runtime deps. Three-pronged trace:
      //   1. The .pnpm store entries (where pnpm actually puts the files)
      //   2. Symlinks under apps/web/node_modules (what Node walks looking
      //      for `node_modules/<pkg>` from .next/server/...)
      //   3. The full @remotion/* and @rspack/* and @sparticuz/* trees
      //      to capture anything we forgot
      "node_modules/.pnpm/@remotion+**/**/*",
      "node_modules/.pnpm/@rspack+**/**/*",
      "node_modules/.pnpm/@sparticuz+**/**/*",
      "node_modules/.pnpm/remotion@**/**/*",
      "apps/web/node_modules/@remotion/**/*",
      "apps/web/node_modules/@rspack/**/*",
      "apps/web/node_modules/@sparticuz/**/*",
      "apps/web/node_modules/remotion/**/*",
      // The @orb/motion-reel package's source — Remotion's bundler reads
      // it directly at runtime to compile the compositions.
      "packages/motion-reel/**/*",
      "apps/web/node_modules/@orb/motion-reel/**/*",
    ],
    // Vercel's per-route function tracer sometimes drops files matched
    // by the "/**/*" pattern when a specific route doesn't statically
    // reference them. Repeat the motion-reel + remotion paths on the
    // exact route that needs them so they ship in this Lambda's
    // bundle even when the global glob isn't honored. Paths relative
    // to outputFileTracingRoot (the repo root) since that's set above.
    "/api/motion-reel/render": [
      "packages/motion-reel/**/*",
      "node_modules/.pnpm/@remotion+**/**/*",
      "node_modules/.pnpm/@rspack+**/**/*",
      "node_modules/.pnpm/@sparticuz+**/**/*",
      "node_modules/.pnpm/remotion@**/**/*",
    ],
  },
};

export default nextConfig;
