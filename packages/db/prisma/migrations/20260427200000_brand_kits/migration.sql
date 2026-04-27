-- BrandKit: visual + tonal brand spec, one per user.
CREATE TABLE IF NOT EXISTS "brand_kits" (
  "id"            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"       UUID         NOT NULL UNIQUE,
  "palette"       JSONB        NOT NULL,
  "typography"    JSONB        NOT NULL,
  "logo_variants" JSONB        NOT NULL,
  "cover_samples" JSONB        NOT NULL,
  "image_style"   TEXT         NOT NULL,
  "voice_tone"    JSONB,
  "version"       INTEGER      NOT NULL DEFAULT 1,
  "generated_at"  TIMESTAMPTZ  NOT NULL,
  "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "brand_kits_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
