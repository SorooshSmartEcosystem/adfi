-- Echo v2 — polymorphic content formats.
-- Adds ContentFormat enum, format column on content_drafts, and brief JSONB.

CREATE TYPE "ContentFormat" AS ENUM (
  'SINGLE_POST',
  'CAROUSEL',
  'REEL_SCRIPT',
  'EMAIL_NEWSLETTER',
  'STORY_SEQUENCE'
);

ALTER TABLE "content_drafts"
  ADD COLUMN "format" "ContentFormat" NOT NULL DEFAULT 'SINGLE_POST',
  ADD COLUMN "brief" JSONB;
