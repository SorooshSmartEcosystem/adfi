-- Force-drop any unique constraint on content_plans (user_id,
-- week_start). The previous per-business migration tried
-- DROP CONSTRAINT IF EXISTS content_plans_user_id_week_start_key
-- but the constraint exists under a different name on this database.
-- Symptom: STUDIO users adding a 2nd business in the same week as
-- the first still threw P2002 (user_id, week_start) at runtime.
--
-- Drops by inspecting pg_get_constraintdef(), which works regardless
-- of how the constraint was named when it was created.

DO $$
DECLARE
  con record;
BEGIN
  FOR con IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'content_plans'::regclass
      AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) ILIKE '%(user_id, week_start)%'
  LOOP
    EXECUTE format(
      'ALTER TABLE content_plans DROP CONSTRAINT %I',
      con.conname
    );
  END LOOP;
END$$;

-- Same for any standalone unique INDEX on (user_id, week_start).
-- pg_get_indexdef returns the full CREATE INDEX statement which
-- contains the column list — match against that string.
DO $$
DECLARE
  ix record;
BEGIN
  FOR ix IN
    SELECT i.indexrelid::regclass::text AS idxname
    FROM pg_index i
    WHERE i.indrelid = 'content_plans'::regclass
      AND i.indisunique
      AND NOT i.indisprimary
      AND pg_get_indexdef(i.indexrelid) ILIKE '%(user_id, week_start)%'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %s', ix.idxname);
  END LOOP;
END$$;
