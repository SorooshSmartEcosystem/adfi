-- AgentContext was 1:1 with User. Moves to 1:1 with Business so each
-- business gets its own brand voice / strategist output. Multi-business
-- users (STUDIO 2 / AGENCY 8) get a separate AgentContext row per
-- Business; SOLO/TEAM users still have exactly one (one Business per
-- user).

-- 1. Backfill any AgentContext row missing businessId from the user's
--    currentBusinessId. After 2026-04-28's business_model migration,
--    every user has a currentBusinessId, so this should fill every row.
UPDATE agent_context AS ac
SET business_id = u.current_business_id
FROM users u
WHERE u.id = ac.user_id
  AND ac.business_id IS NULL
  AND u.current_business_id IS NOT NULL;

-- 2. Drop the userId unique constraint that limited a user to one
--    AgentContext. The unique on businessId (already declared on the
--    column) carries the new per-business contract.
ALTER TABLE agent_context DROP CONSTRAINT IF EXISTS agent_context_user_id_key;

-- 3. Tighten businessId to NOT NULL — every AgentContext belongs to
--    exactly one Business now. Skip rows where business_id is still
--    null (shouldn't exist after step 1, but defensively keep the
--    column nullable on the SQL side; we'll enforce required in
--    Prisma's schema once verified clean).
-- Deliberately not adding NOT NULL constraint here so the migration
-- is idempotent across Supabase's deploy script. Prisma schema
-- changes from `String?` → `String` later, after we're sure step 1
-- backfilled everything.

-- 4. Index on userId so per-user lookups (e.g. "list all of this
--    user's voices") stay fast even with multiple rows per user.
CREATE INDEX IF NOT EXISTS agent_context_user_id_idx
  ON agent_context (user_id);
