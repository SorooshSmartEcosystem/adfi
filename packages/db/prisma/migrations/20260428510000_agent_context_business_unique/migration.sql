-- Add the missing unique constraint on agent_context.business_id.
-- The previous per-business migration dropped the userId unique but
-- the schema's `businessId String? @unique` was never realized as
-- an actual constraint, so Prisma upserts keyed on businessId threw
-- "no unique or exclusion constraint matching the ON CONFLICT
-- specification" at runtime.
--
-- Tricky bit: a leftover *index* with the same name exists from an
-- earlier deploy where a unique was attempted then dropped — so a
-- naive ADD CONSTRAINT trips "relation already exists". Drop any
-- orphan index first, then add the constraint.

DO $$
DECLARE
  has_constraint boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'agent_context'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%(business_id)%'
  ) INTO has_constraint;

  IF NOT has_constraint THEN
    -- Defensive: deduplicate any rows that share a business_id
    -- before adding the unique. None should exist in practice.
    DELETE FROM agent_context a
    USING agent_context b
    WHERE a.business_id = b.business_id
      AND a.id < b.id
      AND a.business_id IS NOT NULL;

    -- Drop any leftover index named like the constraint we want to
    -- create — orphan from an earlier failed migration.
    DROP INDEX IF EXISTS agent_context_business_id_key;
    DROP INDEX IF EXISTS agent_context_business_id_unique;

    ALTER TABLE agent_context
      ADD CONSTRAINT agent_context_business_id_key
      UNIQUE (business_id);
  END IF;
END$$;
