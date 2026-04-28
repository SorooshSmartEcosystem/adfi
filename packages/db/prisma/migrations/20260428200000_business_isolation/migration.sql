-- Per-business data isolation. Adds business_id (nullable, FK SET NULL or
-- CASCADE depending on the table's lifecycle) to every per-business table
-- and backfills it from users.current_business_id. Uniqueness constraints
-- on user_id are loosened where multi-business breaks them (BrandKit,
-- AgentContext) — uniqueness moves to business_id instead.
--
-- This migration is idempotent: every ALTER / CREATE / ADD CONSTRAINT is
-- guarded with `IF NOT EXISTS` or a DO-block exception trap so a
-- partially-applied state can be retried safely. We need this because
-- Postgres' ALTER TABLE ADD CONSTRAINT doesn't accept IF NOT EXISTS for
-- foreign keys — the DO block catches duplicate_object and continues.

-- Helper: idempotent ADD CONSTRAINT. Re-running is a no-op if the
-- constraint with the same name already exists.
CREATE OR REPLACE FUNCTION pg_temp.add_fk_if_missing(
  p_table TEXT,
  p_constraint TEXT,
  p_column TEXT,
  p_ref_table TEXT,
  p_on_delete TEXT
) RETURNS VOID AS $$
DECLARE
  exists_count INT;
BEGIN
  SELECT COUNT(*) INTO exists_count
  FROM pg_constraint
  WHERE conname = p_constraint
    AND conrelid = format('"%s"', p_table)::regclass;

  IF exists_count = 0 THEN
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I(id) ON DELETE %s',
      p_table, p_constraint, p_column, p_ref_table, p_on_delete
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. brand_kits — drop unique on user_id, add unique on business_id.
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

SELECT pg_temp.add_fk_if_missing('brand_kits', 'brand_kits_business_id_fkey', 'business_id', 'businesses', 'CASCADE');

-- ============================================================
-- 2. agent_context — was 1:1 with User (user_id @id). Now: id PK,
--    user_id @unique (back-compat), business_id @unique.
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

-- Swap PK from user_id → id. Idempotent: if id is already PK, the
-- DROP no-ops and the ADD throws which we ignore.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname IN ('agent_context_pkey', 'AgentContext_pkey')
      AND conrelid = '"agent_context"'::regclass
      AND (
        SELECT a.attname FROM pg_attribute a
        WHERE a.attrelid = '"agent_context"'::regclass
          AND a.attnum = ANY(conkey)
          AND a.attname = 'user_id'
      ) IS NOT NULL
  ) THEN
    EXECUTE 'ALTER TABLE "agent_context" DROP CONSTRAINT IF EXISTS "agent_context_pkey"';
    EXECUTE 'ALTER TABLE "agent_context" DROP CONSTRAINT IF EXISTS "AgentContext_pkey"';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE contype = 'p'
      AND conrelid = '"agent_context"'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE "agent_context" ADD PRIMARY KEY ("id")';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "agent_context_user_id_key"
  ON "agent_context"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "agent_context_business_id_key"
  ON "agent_context"("business_id")
  WHERE "business_id" IS NOT NULL;

SELECT pg_temp.add_fk_if_missing('agent_context', 'agent_context_business_id_fkey', 'business_id', 'businesses', 'CASCADE');

-- ============================================================
-- 3. Generic per-table: ADD COLUMN business_id, backfill, index, FK.
--    Each block is idempotent.
-- ============================================================

-- phone_numbers (SET NULL)
ALTER TABLE "phone_numbers" ADD COLUMN IF NOT EXISTS "business_id" UUID;
UPDATE "phone_numbers" pn SET business_id = u.current_business_id
  FROM "users" u WHERE pn.user_id = u.id AND pn.business_id IS NULL
  AND u.current_business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS "phone_numbers_business_id_idx" ON "phone_numbers"("business_id");
SELECT pg_temp.add_fk_if_missing('phone_numbers', 'phone_numbers_business_id_fkey', 'business_id', 'businesses', 'SET NULL');

-- connected_accounts (SET NULL)
ALTER TABLE "connected_accounts" ADD COLUMN IF NOT EXISTS "business_id" UUID;
UPDATE "connected_accounts" ca SET business_id = u.current_business_id
  FROM "users" u WHERE ca.user_id = u.id AND ca.business_id IS NULL
  AND u.current_business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS "connected_accounts_business_id_provider_idx"
  ON "connected_accounts"("business_id", "provider");
SELECT pg_temp.add_fk_if_missing('connected_accounts', 'connected_accounts_business_id_fkey', 'business_id', 'businesses', 'SET NULL');

-- content_drafts (CASCADE)
ALTER TABLE "content_drafts" ADD COLUMN IF NOT EXISTS "business_id" UUID;
UPDATE "content_drafts" cd SET business_id = u.current_business_id
  FROM "users" u WHERE cd.user_id = u.id AND cd.business_id IS NULL
  AND u.current_business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS "content_drafts_business_id_status_idx"
  ON "content_drafts"("business_id", "status");
SELECT pg_temp.add_fk_if_missing('content_drafts', 'content_drafts_business_id_fkey', 'business_id', 'businesses', 'CASCADE');

-- content_plans (CASCADE)
ALTER TABLE "content_plans" ADD COLUMN IF NOT EXISTS "business_id" UUID;
UPDATE "content_plans" cp SET business_id = u.current_business_id
  FROM "users" u WHERE cp.user_id = u.id AND cp.business_id IS NULL
  AND u.current_business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS "content_plans_business_id_status_idx"
  ON "content_plans"("business_id", "status");
SELECT pg_temp.add_fk_if_missing('content_plans', 'content_plans_business_id_fkey', 'business_id', 'businesses', 'CASCADE');

-- content_posts (CASCADE)
ALTER TABLE "content_posts" ADD COLUMN IF NOT EXISTS "business_id" UUID;
UPDATE "content_posts" cp SET business_id = u.current_business_id
  FROM "users" u WHERE cp.user_id = u.id AND cp.business_id IS NULL
  AND u.current_business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS "content_posts_business_id_published_at_idx"
  ON "content_posts"("business_id", "published_at");
SELECT pg_temp.add_fk_if_missing('content_posts', 'content_posts_business_id_fkey', 'business_id', 'businesses', 'CASCADE');

-- messages (CASCADE)
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "business_id" UUID;
UPDATE "messages" m SET business_id = u.current_business_id
  FROM "users" u WHERE m.user_id = u.id AND m.business_id IS NULL
  AND u.current_business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS "messages_business_id_created_at_idx"
  ON "messages"("business_id", "created_at");
SELECT pg_temp.add_fk_if_missing('messages', 'messages_business_id_fkey', 'business_id', 'businesses', 'CASCADE');

-- calls (CASCADE)
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "business_id" UUID;
UPDATE "calls" c SET business_id = u.current_business_id
  FROM "users" u WHERE c.user_id = u.id AND c.business_id IS NULL
  AND u.current_business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS "calls_business_id_started_at_idx"
  ON "calls"("business_id", "started_at");
SELECT pg_temp.add_fk_if_missing('calls', 'calls_business_id_fkey', 'business_id', 'businesses', 'CASCADE');

-- appointments (CASCADE)
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "business_id" UUID;
UPDATE "appointments" a SET business_id = u.current_business_id
  FROM "users" u WHERE a.user_id = u.id AND a.business_id IS NULL
  AND u.current_business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS "appointments_business_id_scheduled_for_idx"
  ON "appointments"("business_id", "scheduled_for");
SELECT pg_temp.add_fk_if_missing('appointments', 'appointments_business_id_fkey', 'business_id', 'businesses', 'CASCADE');

-- competitors (CASCADE)
ALTER TABLE "competitors" ADD COLUMN IF NOT EXISTS "business_id" UUID;
UPDATE "competitors" c SET business_id = u.current_business_id
  FROM "users" u WHERE c.user_id = u.id AND c.business_id IS NULL
  AND u.current_business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS "competitors_business_id_idx" ON "competitors"("business_id");
SELECT pg_temp.add_fk_if_missing('competitors', 'competitors_business_id_fkey', 'business_id', 'businesses', 'CASCADE');

-- subscribers (CASCADE)
ALTER TABLE "subscribers" ADD COLUMN IF NOT EXISTS "business_id" UUID;
UPDATE "subscribers" s SET business_id = u.current_business_id
  FROM "users" u WHERE s.user_id = u.id AND s.business_id IS NULL
  AND u.current_business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS "subscribers_business_id_status_idx"
  ON "subscribers"("business_id", "status");
SELECT pg_temp.add_fk_if_missing('subscribers', 'subscribers_business_id_fkey', 'business_id', 'businesses', 'CASCADE');

-- findings (CASCADE)
ALTER TABLE "findings" ADD COLUMN IF NOT EXISTS "business_id" UUID;
UPDATE "findings" f SET business_id = u.current_business_id
  FROM "users" u WHERE f.user_id = u.id AND f.business_id IS NULL
  AND u.current_business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS "findings_business_id_created_at_idx"
  ON "findings"("business_id", "created_at");
SELECT pg_temp.add_fk_if_missing('findings', 'findings_business_id_fkey', 'business_id', 'businesses', 'CASCADE');

-- contacts (CASCADE)
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "business_id" UUID;
UPDATE "contacts" c SET business_id = u.current_business_id
  FROM "users" u WHERE c.user_id = u.id AND c.business_id IS NULL
  AND u.current_business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS "contacts_business_id_last_seen_at_idx"
  ON "contacts"("business_id", "last_seen_at");
SELECT pg_temp.add_fk_if_missing('contacts', 'contacts_business_id_fkey', 'business_id', 'businesses', 'CASCADE');
