-- Add AGENCY tier to the Plan enum. Used by the new multi-business
-- tier ($499 / 8 businesses / 2000 shared credits). Existing
-- subscriptions are unaffected — this is additive only.

ALTER TYPE "Plan" ADD VALUE IF NOT EXISTS 'AGENCY';
