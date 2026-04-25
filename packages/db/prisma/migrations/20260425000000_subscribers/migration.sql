-- Newsletter subscribers (the user's customer list).
-- Each user has their own list; sending happens via SendGrid /v3/mail/send.

CREATE TYPE "SubscriberStatus" AS ENUM ('ACTIVE', 'UNSUBSCRIBED', 'BOUNCED');

CREATE TABLE "subscribers" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"           UUID NOT NULL,
  "email"             TEXT NOT NULL,
  "name"              TEXT,
  "status"            "SubscriberStatus" NOT NULL DEFAULT 'ACTIVE',
  "source"            TEXT,
  "unsubscribed_at"   TIMESTAMPTZ,
  "unsubscribe_token" UUID NOT NULL DEFAULT gen_random_uuid(),
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "subscribers_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id"),
  CONSTRAINT "subscribers_user_email_unique"
    UNIQUE ("user_id", "email"),
  CONSTRAINT "subscribers_unsubscribe_token_unique"
    UNIQUE ("unsubscribe_token")
);
CREATE INDEX "subscribers_user_status_idx"
  ON "subscribers"("user_id", "status");
