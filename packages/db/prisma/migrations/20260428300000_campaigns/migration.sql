-- Campaigns — paid-ads campaigns drafted, run, and optimized by the
-- Campaign Manager agent (Agent.ADS). Multi-platform from day 1; a
-- single Campaign owns N CampaignAd rows, one per (platform, angle)
-- combination. See docs/CAMPAIGN_MANAGER_DESIGN.md for context.

-- New enums
CREATE TYPE "CampaignStatus" AS ENUM (
  'DRAFT', 'AWAITING_REVIEW', 'ACTIVE', 'PAUSED', 'ENDED', 'REJECTED', 'FAILED'
);

CREATE TYPE "CampaignGoal" AS ENUM (
  'LEADS', 'SALES', 'TRAFFIC', 'AWARENESS', 'APP_INSTALLS'
);

CREATE TYPE "CampaignPlatform" AS ENUM (
  'META', 'GOOGLE', 'YOUTUBE', 'TIKTOK'
);

CREATE TYPE "CampaignAdFormat" AS ENUM (
  'IMAGE', 'VIDEO_SCRIPT', 'TEXT'
);

CREATE TYPE "CampaignAdStatus" AS ENUM (
  'DRAFT', 'ACTIVE', 'PAUSED', 'ENDED', 'REJECTED'
);

CREATE TYPE "CampaignNotificationType" AS ENUM (
  'LAUNCHED', 'FIRST_SPEND', 'HALF_BUDGET_SPENT', 'NEAR_BUDGET_CAP',
  'BUDGET_CAP_REACHED', 'DAILY_WINNER', 'WEEKLY_REPORT', 'AD_REJECTED',
  'SPEND_SPIKE', 'POLICY_FLAG', 'PLATFORM_ERROR'
);

CREATE TYPE "CampaignNotificationSeverity" AS ENUM (
  'INFO', 'ATTENTION', 'URGENT'
);

-- Campaign — top-level campaign metadata.
CREATE TABLE "campaigns" (
  "id"            UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"       UUID                NOT NULL,
  "business_id"   UUID                NOT NULL,
  "status"        "CampaignStatus"    NOT NULL DEFAULT 'DRAFT',
  "name"          TEXT                NOT NULL,
  "brief"         TEXT                NOT NULL,
  "goal"          "CampaignGoal"      NOT NULL,
  "audience"      JSONB               NOT NULL,
  "schedule"      JSONB               NOT NULL,
  "platforms"     "CampaignPlatform"[] NOT NULL DEFAULT '{}',
  "reasoning"     JSONB,
  "approved_at"   TIMESTAMPTZ,
  "paused_at"     TIMESTAMPTZ,
  "ended_at"      TIMESTAMPTZ,
  "created_at"    TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  CONSTRAINT "campaigns_user_id_fkey"     FOREIGN KEY ("user_id")     REFERENCES "users"("id"),
  CONSTRAINT "campaigns_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE
);
CREATE INDEX "campaigns_business_id_status_idx"     ON "campaigns"("business_id", "status");
CREATE INDEX "campaigns_business_id_created_at_idx" ON "campaigns"("business_id", "created_at");

-- CampaignAd — one row per (platform, creative angle) combination.
CREATE TABLE "campaign_ads" (
  "id"                    UUID                NOT NULL DEFAULT gen_random_uuid(),
  "campaign_id"           UUID                NOT NULL,
  "platform"              "CampaignPlatform"  NOT NULL,
  "external_id"           TEXT,
  "external_campaign_id"  TEXT,
  "external_adset_id"     TEXT,
  "angle"                 TEXT                NOT NULL,
  "format"                "CampaignAdFormat"  NOT NULL,
  "creative"              JSONB               NOT NULL,
  "targeting"             JSONB               NOT NULL,
  "status"                "CampaignAdStatus"  NOT NULL DEFAULT 'DRAFT',
  "created_at"            TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  "updated_at"            TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id"),
  CONSTRAINT "campaign_ads_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE
);
CREATE INDEX "campaign_ads_campaign_id_platform_idx" ON "campaign_ads"("campaign_id", "platform");

-- CampaignMetrics — daily rollup per campaign (merged across platforms).
CREATE TABLE "campaign_metrics" (
  "id"                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "campaign_id"             UUID         NOT NULL,
  "day"                     DATE         NOT NULL,
  "spend_cents"             INTEGER      NOT NULL,
  "impressions"             INTEGER      NOT NULL,
  "clicks"                  INTEGER      NOT NULL,
  "conversions"             INTEGER      NOT NULL DEFAULT 0,
  "conversion_value_cents"  INTEGER      NOT NULL DEFAULT 0,
  "raw_insights"            JSONB,
  "created_at"              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "campaign_metrics_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "campaign_metrics_campaign_id_day_key" ON "campaign_metrics"("campaign_id", "day");
CREATE INDEX        "campaign_metrics_campaign_id_day_idx" ON "campaign_metrics"("campaign_id", "day");

-- CampaignAdMetrics — daily rollup per ad (used by weekly rebalance).
CREATE TABLE "campaign_ad_metrics" (
  "id"                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "ad_id"                   UUID         NOT NULL,
  "day"                     DATE         NOT NULL,
  "spend_cents"             INTEGER      NOT NULL,
  "impressions"             INTEGER      NOT NULL,
  "clicks"                  INTEGER      NOT NULL,
  "conversions"             INTEGER      NOT NULL DEFAULT 0,
  "conversion_value_cents"  INTEGER      NOT NULL DEFAULT 0,
  "created_at"              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "campaign_ad_metrics_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "campaign_ads"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "campaign_ad_metrics_ad_id_day_key" ON "campaign_ad_metrics"("ad_id", "day");

-- CampaignNotification — in-app + email + SMS lifecycle events.
CREATE TABLE "campaign_notifications" (
  "id"               UUID                          PRIMARY KEY DEFAULT gen_random_uuid(),
  "campaign_id"      UUID                          NOT NULL,
  "user_id"          UUID                          NOT NULL,
  "type"             "CampaignNotificationType"    NOT NULL,
  "severity"         "CampaignNotificationSeverity" NOT NULL,
  "title"            TEXT                          NOT NULL,
  "body"             TEXT                          NOT NULL,
  "payload"          JSONB,
  "acknowledged"     BOOLEAN                       NOT NULL DEFAULT FALSE,
  "acknowledged_at"  TIMESTAMPTZ,
  "created_at"       TIMESTAMPTZ                   NOT NULL DEFAULT NOW(),
  CONSTRAINT "campaign_notifications_campaign_id_fkey"
    FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE,
  CONSTRAINT "campaign_notifications_user_id_fkey"
    FOREIGN KEY ("user_id")     REFERENCES "users"("id")
);
CREATE INDEX "campaign_notifications_user_id_acknowledged_created_at_idx"
  ON "campaign_notifications"("user_id", "acknowledged", "created_at");
