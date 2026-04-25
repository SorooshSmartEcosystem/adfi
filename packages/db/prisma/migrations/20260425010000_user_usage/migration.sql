-- Per-user monthly credit ledger.
-- Period is 'YYYY-MM'; one row per user per month. Plan + limit are
-- snapshotted at period-start so a mid-month upgrade only increases
-- the next month's allowance (current month keeps original limit).

CREATE TABLE "user_usage" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"       UUID NOT NULL,
  "period"        TEXT NOT NULL,
  "credits_used"  NUMERIC(10, 3) NOT NULL DEFAULT 0,
  "credits_limit" INTEGER NOT NULL,
  "plan"          TEXT NOT NULL,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "user_usage_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id"),
  CONSTRAINT "user_usage_user_period_unique"
    UNIQUE ("user_id", "period")
);
CREATE INDEX "user_usage_user_idx" ON "user_usage"("user_id");
