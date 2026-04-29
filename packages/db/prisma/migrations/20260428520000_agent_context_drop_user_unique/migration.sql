-- Drop ANY remaining unique constraint on agent_context.user_id.
--
-- The previous per-business migration tried `DROP CONSTRAINT IF
-- EXISTS agent_context_user_id_key` but the constraint may live
-- under a different name on some envs (Prisma's naming has shifted
-- across versions). The "Unique constraint failed on the fields:
-- (user_id)" error at runtime confirms a unique on user_id is still
-- enforced — the new-business flow's upsert tried to INSERT a 2nd
-- AgentContext for the same user (different business) and Postgres
-- rejected it.
--
-- This migration enumerates every unique constraint on the user_id
-- column and drops them all. After this, only the unique on
-- business_id remains (added in 20260428510000).

DO $$
DECLARE
  con record;
BEGIN
  FOR con IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid
     AND a.attnum = ANY(c.conkey)
    WHERE c.conrelid = 'agent_context'::regclass
      AND c.contype = 'u'
      AND a.attname = 'user_id'
      -- Don't drop multi-column uniques that include user_id
      AND array_length(c.conkey, 1) = 1
  LOOP
    EXECUTE format('ALTER TABLE agent_context DROP CONSTRAINT %I', con.conname);
  END LOOP;
END$$;

-- Same for any leftover unique INDEX on user_id (constraints back
-- indexes; indexes can also exist standalone).
DO $$
DECLARE
  ix record;
BEGIN
  FOR ix IN
    SELECT i.indexrelid::regclass::text AS idxname
    FROM pg_index i
    JOIN pg_attribute a
      ON a.attrelid = i.indrelid
     AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = 'agent_context'::regclass
      AND i.indisunique
      AND NOT i.indisprimary
      AND a.attname = 'user_id'
      AND array_length(i.indkey::int[], 1) = 1
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %s', ix.idxname);
  END LOOP;
END$$;
