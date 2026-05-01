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
  serverExternalPackages: ["@prisma/client", ".prisma/client"],

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
    ],
  },
};

export default nextConfig;
