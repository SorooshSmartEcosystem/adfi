import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@orb/api", "@orb/auth", "@orb/db", "@orb/ui"],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },

  // Monorepo root — lets Next's file tracer reach sibling packages.
  outputFileTracingRoot: path.join(__dirname, "../../"),

  // Prisma's generated client + rhel query engine binary live deep inside
  // pnpm's nested layout; Vercel's bundle tracer doesn't follow them by
  // default, so include them explicitly.
  outputFileTracingIncludes: {
    "/**/*": [
      "../../node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**/*",
      "../../node_modules/.pnpm/@prisma+client@*/node_modules/@prisma/client/**/*",
    ],
  },
};

export default nextConfig;
