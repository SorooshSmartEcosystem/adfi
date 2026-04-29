-- 2nd attempt at force-dropping the legacy (user_id, week_start) unique
-- on content_plans. Migration 20260429010000 should have done this, but
-- prod is still throwing P2002 (user_id, week_start) at runtime — either
-- that migration's `pg_get_constraintdef ILIKE '%(user_id, week_start)%'`
-- pattern didn't match (e.g. quoted column names, different column
-- order), or the migration was never applied.
--
-- This pass:
--   1. Drops by the canonical Prisma name.
--   2. Falls back to scanning every unique constraint/index on the
--      table and dropping any whose column set is exactly
--      {user_id, week_start} — name-, order-, and quoting-agnostic.
--   3. Logs each drop via RAISE NOTICE so we can see in the migration
--      output what actually got removed.

-- 1. Try the canonical name first. Cheap if it exists, no-op otherwise.
ALTER TABLE content_plans
  DROP CONSTRAINT IF EXISTS content_plans_user_id_week_start_key;

-- 2. Scan and drop any remaining unique CONSTRAINTS on the column set.
DO $$
DECLARE
  con record;
  cols text[];
BEGIN
  FOR con IN
    SELECT c.conname, c.conkey, c.oid
    FROM pg_constraint c
    WHERE c.conrelid = 'content_plans'::regclass
      AND c.contype = 'u'
  LOOP
    SELECT array_agg(a.attname ORDER BY a.attname) INTO cols
    FROM unnest(con.conkey) AS k(attnum)
    JOIN pg_attribute a
      ON a.attrelid = 'content_plans'::regclass
     AND a.attnum = k.attnum;

    IF cols = ARRAY['user_id', 'week_start']::text[] THEN
      RAISE NOTICE 'dropping unique constraint %', con.conname;
      EXECUTE format(
        'ALTER TABLE content_plans DROP CONSTRAINT %I',
        con.conname
      );
    END IF;
  END LOOP;
END$$;

-- 3. Scan and drop any remaining unique INDEXES on the column set.
--    A unique constraint always has a backing index, but a unique
--    index can exist without an explicit constraint — covered here.
DO $$
DECLARE
  ix record;
  cols text[];
BEGIN
  FOR ix IN
    SELECT i.indexrelid AS oid, i.indkey, c.relname AS idxname
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indexrelid
    WHERE i.indrelid = 'content_plans'::regclass
      AND i.indisunique
      AND NOT i.indisprimary
  LOOP
    SELECT array_agg(a.attname ORDER BY a.attname) INTO cols
    FROM unnest(ix.indkey) AS k(attnum)
    JOIN pg_attribute a
      ON a.attrelid = 'content_plans'::regclass
     AND a.attnum = k.attnum;

    IF cols = ARRAY['user_id', 'week_start']::text[] THEN
      RAISE NOTICE 'dropping unique index %', ix.idxname;
      EXECUTE format('DROP INDEX IF EXISTS %I', ix.idxname);
    END IF;
  END LOOP;
END$$;

-- 4. Verify the per-business unique still exists. Re-create if missing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'content_plans'::regclass
      AND contype = 'u'
      AND conname = 'content_plans_business_id_week_start_key'
  ) THEN
    RAISE NOTICE 'restoring per-business unique';
    ALTER TABLE content_plans
      ADD CONSTRAINT content_plans_business_id_week_start_key
      UNIQUE (business_id, week_start);
  END IF;
END$$;
