-- Planner: weekly editorial plan + items.

CREATE TYPE "ContentPlanStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TYPE "ContentPlanItemStatus" AS ENUM (
  'PLANNED',
  'DRAFTED',
  'PUBLISHED',
  'SKIPPED'
);

CREATE TABLE "content_plans" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"     UUID NOT NULL,
  "week_start"  DATE NOT NULL,
  "week_end"    DATE NOT NULL,
  "thesis"      TEXT,
  "reasoning"   JSONB,
  "status"      "ContentPlanStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "content_plans_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id"),
  CONSTRAINT "content_plans_user_week_unique"
    UNIQUE ("user_id", "week_start")
);
CREATE INDEX "content_plans_user_status_idx"
  ON "content_plans"("user_id", "status");

CREATE TABLE "content_plan_items" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "plan_id"       UUID NOT NULL,
  "scheduled_for" TIMESTAMPTZ NOT NULL,
  "platform"      "Platform" NOT NULL,
  "format"        "ContentFormat" NOT NULL,
  "angle"         TEXT NOT NULL,
  "hook_idea"     TEXT NOT NULL,
  "intent"        TEXT NOT NULL,
  "audience"      TEXT NOT NULL,
  "pillar"        TEXT NOT NULL,
  "reasoning"     TEXT NOT NULL,
  "status"        "ContentPlanItemStatus" NOT NULL DEFAULT 'PLANNED',
  "draft_id"      UUID UNIQUE,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "content_plan_items_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "content_plans"("id") ON DELETE CASCADE,
  CONSTRAINT "content_plan_items_draft_id_fkey"
    FOREIGN KEY ("draft_id") REFERENCES "content_drafts"("id")
);
CREATE INDEX "content_plan_items_plan_scheduled_idx"
  ON "content_plan_items"("plan_id", "scheduled_for");
