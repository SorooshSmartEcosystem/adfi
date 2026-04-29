-- Move ContentPlan uniqueness from (userId, weekStart) to (businessId,
-- weekStart) so multi-business users (STUDIO/AGENCY) can have one plan
-- per business per week. The old constraint forced one plan per user
-- per week — fine when every user had one business, but it blocks the
-- second business's plan from being created in the same calendar
-- week as the first.
--
-- Idempotent — checks pg_constraint before each step.

DO $$
BEGIN
  -- 1. Drop the userId+weekStart unique. Constraint name follows
  --    Prisma's default convention.
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'content_plans'::regclass
      AND contype = 'u'
      AND conname = 'content_plans_user_id_week_start_key'
  ) THEN
    ALTER TABLE content_plans
      DROP CONSTRAINT content_plans_user_id_week_start_key;
  END IF;
END$$;

-- 2. Backfill businessId from user.currentBusinessId for any plan
--    that's missing it. Defensive — the multi-business isolation
--    migration should have done this already.
UPDATE content_plans cp
SET business_id = u.current_business_id
FROM users u
WHERE u.id = cp.user_id
  AND cp.business_id IS NULL
  AND u.current_business_id IS NOT NULL;

-- 3. Deduplicate any rows that share (businessId, weekStart) before
--    adding the unique. Should be a no-op in practice.
DELETE FROM content_plans a
USING content_plans b
WHERE a.business_id = b.business_id
  AND a.week_start = b.week_start
  AND a.id < b.id
  AND a.business_id IS NOT NULL;

-- 4. Add the new unique. Skip the index that already exists from the
--    schema's @@unique reflecting the old shape.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'content_plans'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%(business_id, week_start)%'
  ) THEN
    DROP INDEX IF EXISTS content_plans_business_id_week_start_key;
    ALTER TABLE content_plans
      ADD CONSTRAINT content_plans_business_id_week_start_key
      UNIQUE (business_id, week_start);
  END IF;
END$$;

-- 5. Keep a non-unique index on (userId, weekStart) for queries that
--    look up plans across all of a user's businesses (admin tools etc.).
CREATE INDEX IF NOT EXISTS content_plans_user_id_week_start_idx
  ON content_plans (user_id, week_start);
