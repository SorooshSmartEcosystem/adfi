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
    "/**/*": [
      "node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**/*",
      "node_modules/.pnpm/@prisma+client@*/node_modules/@prisma/client/**/*",
      "node_modules/.pnpm/@prisma+engines@*/node_modules/@prisma/engines/**/*",
      // Remotion runtime deps (loaded via opaque require — see motion-reel.ts).
      "node_modules/.pnpm/@remotion+renderer@*/node_modules/@remotion/renderer/**/*",
      "node_modules/.pnpm/@remotion+bundler@*/node_modules/@remotion/bundler/**/*",
      "node_modules/.pnpm/@remotion+compositor-linux-x64-gnu@*/node_modules/@remotion/compositor-linux-x64-gnu/**/*",
      "node_modules/.pnpm/@remotion+compositor-linux-x64-musl@*/node_modules/@remotion/compositor-linux-x64-musl/**/*",
      "node_modules/.pnpm/@rspack+core@*/node_modules/@rspack/core/**/*",
      "node_modules/.pnpm/@rspack+binding-linux-x64-gnu@*/node_modules/@rspack/binding-linux-x64-gnu/**/*",
      "node_modules/.pnpm/@rspack+binding@*/node_modules/@rspack/binding/**/*",
      // Serverless Chromium binary + its launcher.
      "node_modules/.pnpm/@sparticuz+chromium@*/node_modules/@sparticuz/chromium/**/*",
      // The @orb/motion-reel package's source — Remotion's bundler reads
      // it directly at runtime to compile the compositions.
      "packages/motion-reel/**/*",
    ],
  },
};

export default nextConfig;
