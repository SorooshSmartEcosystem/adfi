-- Business profile fields. Logo + website are surfaced in settings;
-- name + description used by every agent prompt.

ALTER TABLE "users"
  ADD COLUMN "business_name" TEXT,
  ADD COLUMN "business_logo_url" TEXT,
  ADD COLUMN "business_website_url" TEXT;
