// One-off: upgrades the meta-reviewer@adfi.ca account to TEAM-tier
// trial for 1 year. Use when the account already exists (signed up via
// the UI) and you just need to grant access without going through
// Stripe.
//
// Run from the repo root:
//   pnpm --filter @orb/db exec tsx ../../scripts/upgrade-meta-reviewer.ts
//
// Reads DATABASE_URL from .env.local.

import { PrismaClient } from "@prisma/client";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(__dirname, "../.env.local") });

const EMAIL = "meta-reviewer@adfi.ca";

async function main() {
  const db = new PrismaClient();

  const user = await db.user.findUnique({ where: { email: EMAIL } });
  if (!user) {
    throw new Error(
      `User ${EMAIL} not found — sign up at adfi.ca/signup first.`,
    );
  }

  const oneYear = new Date();
  oneYear.setFullYear(oneYear.getFullYear() + 1);

  await db.user.update({
    where: { id: user.id },
    data: {
      trialEndsAt: oneYear,
      onboardedAt: user.onboardedAt ?? new Date(),
    },
  });

  console.log(`✓ ${EMAIL} now has TEAM-tier trial until ${oneYear.toISOString()}`);
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
