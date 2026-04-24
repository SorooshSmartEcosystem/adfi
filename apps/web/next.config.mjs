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

  // Monorepo root — tells Next's file tracer where the project actually starts
  // (Vercel mounts this at /var/task at runtime).
  outputFileTracingRoot: path.join(__dirname, "../../"),

  // Include the generated Prisma client + the rhel query-engine binary in the
  // deployed bundle. Paths are relative to outputFileTracingRoot.
  outputFileTracingIncludes: {
    "/**/*": [
      "node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**/*",
      "node_modules/.pnpm/@prisma+client@*/node_modules/@prisma/client/**/*",
      "node_modules/.pnpm/@prisma+engines@*/node_modules/@prisma/engines/**/*",
    ],
  },
};

export default nextConfig;
