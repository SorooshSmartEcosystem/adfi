-- Business model — one brand the User runs. Solopreneurs have one (auto
-- bootstrapped from their existing User.business_* fields). STUDIO users
-- can have up to 2; AGENCY up to 8. This first migration only creates the
-- table + populates a default Business per existing User; the per-table
-- businessId rollout (BrandKit → Business, ContentDraft → Business, etc.)
-- happens in subsequent migrations so we don't take a multi-table outage.

CREATE TABLE IF NOT EXISTS "businesses" (
  "id"            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"       UUID         NOT NULL,
  "name"          TEXT         NOT NULL,
  "description"   TEXT,
  "logo_url"      TEXT,
  "website_url"   TEXT,
  "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "deleted_at"    TIMESTAMPTZ,
  CONSTRAINT "businesses_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "businesses_user_id_idx" ON "businesses" ("user_id");

-- Add the back-reference to User. Nullable because (a) some User rows
-- exist before any Business does, (b) we'll populate it in the next
-- statement.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "current_business_id" UUID,
  ADD CONSTRAINT "users_current_business_id_fkey"
    FOREIGN KEY ("current_business_id") REFERENCES "businesses"("id") ON DELETE SET NULL;

-- Bootstrap: every existing User who has any business_* data gets a
-- Business row mirroring that data, and current_business_id is set to
-- it. Users with no business data yet (just signed up) get a placeholder
-- Business named after their email-username — they'll edit it during
-- onboarding.
WITH inserted AS (
  INSERT INTO "businesses" ("user_id", "name", "description", "logo_url", "website_url")
  SELECT
    u.id,
    COALESCE(NULLIF(TRIM(u.business_name), ''), SPLIT_PART(u.email, '@', 1), 'my business'),
    u.business_description,
    u.business_logo_url,
    u.business_website_url
  FROM "users" u
  WHERE u.current_business_id IS NULL
  RETURNING id, user_id
)
UPDATE "users" u
SET current_business_id = i.id
FROM inserted i
WHERE u.id = i.user_id;
