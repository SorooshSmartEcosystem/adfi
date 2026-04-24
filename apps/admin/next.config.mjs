import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@orb/api", "@orb/auth", "@orb/db", "@orb/ui"],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },

  serverExternalPackages: ["@prisma/client", ".prisma/client"],

  outputFileTracingRoot: path.join(__dirname, "../../"),

  outputFileTracingIncludes: {
    "/**/*": [
      "node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**/*",
      "node_modules/.pnpm/@prisma+client@*/node_modules/@prisma/client/**/*",
      "node_modules/.pnpm/@prisma+engines@*/node_modules/@prisma/engines/**/*",
    ],
  },
};

export default nextConfig;
