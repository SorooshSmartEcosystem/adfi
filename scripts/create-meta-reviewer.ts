// One-off: provisions the Meta App Review test account.
//
// What it does:
//   1. Creates a Supabase auth user (email + password, email-confirmed).
//   2. Upserts the matching DB User row.
//   3. Creates a Business ("Pottery studio in Toronto") and sets it as
//      the User's currentBusinessId.
//   4. Marks onboardedAt = now + trialEndsAt = +365d so the account
//      gets full TEAM-tier access for the duration of Meta's review
//      and a year afterward without going through Stripe.
//
// Run from the repo root:
//   pnpm tsx scripts/create-meta-reviewer.ts
//
// Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + DATABASE_URL from
// .env.local (loaded via dotenv).

import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(__dirname, "../.env.local") });

const EMAIL = "meta-reviewer@adfi.ca";
const PASSWORD = "Test123456!";
const BUSINESS_NAME = "Toronto Pottery Studio";
const BUSINESS_DESCRIPTION =
  "A small ceramics studio in Toronto offering wheel-throwing classes, " +
  "open studio time, and one-of-a-kind pieces sold online and at local " +
  "markets. Voice is warm and craft-focused.";

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local",
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const db = new PrismaClient();

  console.log(`→ Creating Supabase auth user ${EMAIL}…`);

  // 1. Try to create the auth user. If it already exists, look it up
  //    instead — keeps the script idempotent so re-runs don't fail.
  let authUserId: string;
  const { data: created, error: createErr } =
    await supabase.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    });

  if (createErr) {
    if (
      createErr.message.toLowerCase().includes("already") ||
      createErr.message.toLowerCase().includes("exists") ||
      createErr.message.toLowerCase().includes("registered")
    ) {
      console.log("  user already exists — looking it up");
      const { data: list, error: listErr } =
        await supabase.auth.admin.listUsers({ perPage: 200 });
      if (listErr) throw listErr;
      const existing = list.users.find((u) => u.email === EMAIL);
      if (!existing) {
        throw new Error(
          `auth says ${EMAIL} exists but listUsers can't find it`,
        );
      }
      authUserId = existing.id;
      // Reset password so the credentials we hand to Meta still work.
      const { error: updateErr } = await supabase.auth.admin.updateUserById(
        authUserId,
        { password: PASSWORD },
      );
      if (updateErr) throw updateErr;
      console.log("  password reset");
    } else {
      throw createErr;
    }
  } else {
    authUserId = created.user!.id;
    console.log(`  created ${authUserId}`);
  }

  // 2. Upsert User row.
  const oneYear = new Date();
  oneYear.setFullYear(oneYear.getFullYear() + 1);

  console.log("→ Upserting DB User row…");
  await db.user.upsert({
    where: { id: authUserId },
    create: {
      id: authUserId,
      email: EMAIL,
      businessName: BUSINESS_NAME,
      businessDescription: BUSINESS_DESCRIPTION,
      onboardedAt: new Date(),
      trialEndsAt: oneYear,
    },
    update: {
      email: EMAIL,
      businessName: BUSINESS_NAME,
      businessDescription: BUSINESS_DESCRIPTION,
      onboardedAt: new Date(),
      trialEndsAt: oneYear,
    },
  });
  console.log("  user upserted");

  // 3. Create or reuse a Business + wire it up as currentBusinessId.
  console.log("→ Ensuring Business row…");
  const existingBiz = await db.business.findFirst({
    where: { userId: authUserId, deletedAt: null },
  });
  let businessId: string;
  if (existingBiz) {
    businessId = existingBiz.id;
    await db.business.update({
      where: { id: businessId },
      data: {
        name: BUSINESS_NAME,
        description: BUSINESS_DESCRIPTION,
      },
    });
    console.log(`  reused ${businessId}`);
  } else {
    const biz = await db.business.create({
      data: {
        userId: authUserId,
        name: BUSINESS_NAME,
        description: BUSINESS_DESCRIPTION,
      },
    });
    businessId = biz.id;
    console.log(`  created ${businessId}`);
  }

  await db.user.update({
    where: { id: authUserId },
    data: { currentBusinessId: businessId },
  });
  console.log("  set as currentBusinessId");

  console.log("\n✓ done");
  console.log(`  email:    ${EMAIL}`);
  console.log(`  password: ${PASSWORD}`);
  console.log(`  trial ends: ${oneYear.toISOString()}`);
  console.log(`  business: ${BUSINESS_NAME} (${businessId})`);

  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
