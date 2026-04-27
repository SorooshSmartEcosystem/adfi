-- BrandKitVersion: append-only history of every brand-kit generation.
-- The live BrandKit row mirrors the latest version; users can restore
-- a past version into the live row.

CREATE TABLE IF NOT EXISTS "brand_kit_versions" (
  "id"             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "brand_kit_id"   UUID         NOT NULL,
  "version"        INTEGER      NOT NULL,
  "palette"        JSONB        NOT NULL,
  "typography"     JSONB        NOT NULL,
  "logo_templates" JSONB        NOT NULL,
  "cover_samples"  JSONB        NOT NULL,
  "image_style"    TEXT         NOT NULL,
  "logo_concept"   TEXT         NOT NULL,
  "voice_tone"     JSONB,
  "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "brand_kit_versions_brand_kit_id_fkey"
    FOREIGN KEY ("brand_kit_id") REFERENCES "brand_kits"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "brand_kit_versions_brand_kit_id_version_key"
  ON "brand_kit_versions" ("brand_kit_id", "version");

CREATE INDEX IF NOT EXISTS "brand_kit_versions_brand_kit_id_created_at_idx"
  ON "brand_kit_versions" ("brand_kit_id", "created_at");
