-- Per-business data isolation. Adds business_id (nullable, FK SET NULL or
-- CASCADE depending on the table's lifecycle) to every per-business table
-- and backfills it from users.current_business_id. Uniqueness constraints
-- on user_id are loosened where multi-business breaks them (BrandKit,
-- AgentContext) — uniqueness moves to business_id instead.
--
-- Tables updated: phone_numbers, agent_context, connected_accounts,
-- content_drafts, content_plans, content_posts, messages, calls,
-- appointments, competitors, subscribers, findings, contacts, brand_kits.
--
-- All adds are NULL for now so existing code paths keep working. A
-- follow-up migration will tighten to NOT NULL once every router /
-- webhook has been ported.

-- ============================================================
-- 1. brand_kits — drop unique on user_id, add unique on business_id.
--    Each Business has at most one live BrandKit; STUDIO/AGENCY users
--    have multiple kits (one per business).
-- ============================================================
ALTER TABLE "brand_kits"
  ADD COLUMN IF NOT EXISTS "business_id" UUID;

UPDATE "brand_kits" bk
   SET business_id = u.current_business_id
  FROM "users" u
 WHERE bk.user_id = u.id
   AND bk.business_id IS NULL
   AND u.current_business_id IS NOT NULL;

DROP INDEX IF EXISTS "brand_kits_user_id_key";
CREATE UNIQUE INDEX IF NOT EXISTS "brand_kits_business_id_key"
  ON "brand_kits"("business_id")
  WHERE "business_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "brand_kits_user_id_idx" ON "brand_kits"("user_id");

ALTER TABLE "brand_kits"
  ADD CONSTRAINT "brand_kits_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE;

-- ============================================================
-- 2. agent_context — was 1:1 with User (user_id @id). Now: id PK,
--    user_id keeps a unique constraint for back-compat, business_id
--    @unique is the new scope. Each business gets its own brand voice.
-- ============================================================
ALTER TABLE "agent_context"
  ADD COLUMN IF NOT EXISTS "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS "business_id" UUID;

UPDATE "agent_context" ac
   SET business_id = u.current_business_id
  FROM "users" u
 WHERE ac.user_id = u.id
   AND ac.business_id IS NULL
   AND u.current_business_id IS NOT NULL;

ALTER TABLE "agent_context" DROP CONSTRAINT IF EXISTS "agent_context_pkey";
ALTER TABLE "agent_context" ADD PRIMARY KEY ("id");
CREATE UNIQUE INDEX IF NOT EXISTS "agent_context_user_id_key"
  ON "agent_context"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "agent_context_business_id_key"
  ON "agent_context"("business_id")
  WHERE "business_id" IS NOT NULL;

ALTER TABLE "agent_context"
  ADD CONSTRAINT "agent_context_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE;

-- ============================================================
-- 3. Generic helper: for every per-business table that doesn't need a
--    PK rework, add business_id NULL + index + FK + backfill.
-- ============================================================

-- phone_numbers (SET NULL on delete — releasing the number doesn't follow
-- the business cascade, the number lives on the user's account)
ALTER TABLE "phone_numbers" ADD COLUMN IF NOT EXISTS "business_id" UUID;
UPDATE "phone_numbers" pn SET business_id = u.current_business_id
  FROM "users" u WHERE pn.user_id = u.id AND pn.business_id IS NULL
  AND u.current_business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS "phone_numbers_business_id_idx" ON "phone_numbers"("business_id");
ALTER TABLE "phone_numbers" ADD CONSTRAINT "phone_numbers_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE SET NULL;

-- connected_accounts (SET NULL — disconnecting a business shouldn't drop
-- the underlying token; user can re-attach to another business)
ALTER TABLE "connected_accounts" ADD COLUMN IF NOT EXISTS "business_id" UUID;
UPDATE "connected_accounts" ca SET business_id = u.current_business_id
  FROM "users" u WHERE ca.user_id = u.id AND ca.business_id IS NULL
  AND u.current_business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS "connected_accounts_business_id_provider_idx"
  ON "connected_accounts"("business_id", "provider");
ALTER TABLE "connected_accounts" ADD CONSTRAINT "connected_accounts_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE SET NULL;

-- content_drafts (CASCADE — drafts belong to the business, deleted with it)
ALTER TABLE "content_drafts" ADD COLUMN IF NOT EXISTS "business_id" UUID;
UPDATE "content_drafts" cd SET business_id = u.current_business_id
  FROM "users" u WHERE cd.user_id = u.id AND cd.business_id IS NULL
  AND u.current_business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS "content_drafts_business_id_status_idx"
  ON "content_drafts"("business_id", "status");
ALTER TABLE "content_drafts" ADD CONSTRAINT "content_drafts_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE;

-- content_plans (CASCADE)
ALTER TABLE "content_plans" ADD COLUMN IF NOT EXISTS "business_id" UUID;
UPDATE "content_plans" cp SET business_id = u.current_business_id
  FROM "users" u WHERE cp.user_id = u.id AND cp.business_id IS NULL
  AND u.current_business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS "content_plans_business_id_status_idx"
  ON "content_plans"("business_id", "status");
ALTER TABLE "content_plans" ADD CONSTRAINT "content_plans_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE;

-- content_posts (CASCADE)
ALTER TABLE "content_posts" ADD COLUMN IF NOT EXISTS "business_id" UUID;
UPDATE "content_posts" cp SET business_id = u.current_business_id
  FROM "users" u WHERE cp.user_id = u.id AND cp.business_id IS NULL
  AND u.current_business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS "content_posts_business_id_published_at_idx"
  ON "content_posts"("business_id", "published_at");
ALTER TABLE "content_posts" ADD CONSTRAINT "content_posts_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE;

-- messages (CASCADE)
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "business_id" UUID;
UPDATE "messages" m SET business_id = u.current_business_id
  FROM "users" u WHERE m.user_id = u.id AND m.business_id IS NULL
  AND u.current_business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS "messages_business_id_created_at_idx"
  ON "messages"("business_id", "created_at");
ALTER TABLE "messages" ADD CONSTRAINT "messages_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE;

-- calls (CASCADE)
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "business_id" UUID;
UPDATE "calls" c SET business_id = u.current_business_id
  FROM "users" u WHERE c.user_id = u.id AND c.business_id IS NULL
  AND u.current_business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS "calls_business_id_started_at_idx"
  ON "calls"("business_id", "started_at");
ALTER TABLE "calls" ADD CONSTRAINT "calls_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE;

-- appointments (CASCADE)
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "business_id" UUID;
UPDATE "appointments" a SET business_id = u.current_business_id
  FROM "users" u WHERE a.user_id = u.id AND a.business_id IS NULL
  AND u.current_business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS "appointments_business_id_scheduled_for_idx"
  ON "appointments"("business_id", "scheduled_for");
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE;

-- competitors (CASCADE)
ALTER TABLE "competitors" ADD COLUMN IF NOT EXISTS "business_id" UUID;
UPDATE "competitors" c SET business_id = u.current_business_id
  FROM "users" u WHERE c.user_id = u.id AND c.business_id IS NULL
  AND u.current_business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS "competitors_business_id_idx" ON "competitors"("business_id");
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE;

-- subscribers (CASCADE)
ALTER TABLE "subscribers" ADD COLUMN IF NOT EXISTS "business_id" UUID;
UPDATE "subscribers" s SET business_id = u.current_business_id
  FROM "users" u WHERE s.user_id = u.id AND s.business_id IS NULL
  AND u.current_business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS "subscribers_business_id_status_idx"
  ON "subscribers"("business_id", "status");
ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE;

-- findings (CASCADE)
ALTER TABLE "findings" ADD COLUMN IF NOT EXISTS "business_id" UUID;
UPDATE "findings" f SET business_id = u.current_business_id
  FROM "users" u WHERE f.user_id = u.id AND f.business_id IS NULL
  AND u.current_business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS "findings_business_id_created_at_idx"
  ON "findings"("business_id", "created_at");
ALTER TABLE "findings" ADD CONSTRAINT "findings_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE;

-- contacts (CASCADE)
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "business_id" UUID;
UPDATE "contacts" c SET business_id = u.current_business_id
  FROM "users" u WHERE c.user_id = u.id AND c.business_id IS NULL
  AND u.current_business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS "contacts_business_id_last_seen_at_idx"
  ON "contacts"("business_id", "last_seen_at");
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE;
