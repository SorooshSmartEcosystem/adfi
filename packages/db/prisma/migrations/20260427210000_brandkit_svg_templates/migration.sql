-- Switch BrandKit from raster logo URLs to SVG templates with palette
-- placeholders. Existing kits become 'incomplete' (empty logo_templates)
-- and need to be regenerated; the UI handles that case.

-- Drop the old raster URLs column.
ALTER TABLE "brand_kits"
  DROP COLUMN IF EXISTS "logo_variants";

-- New columns. Defaults so existing rows pass; defaults removed after.
ALTER TABLE "brand_kits"
  ADD COLUMN IF NOT EXISTS "logo_templates" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "logo_concept"   TEXT  NOT NULL DEFAULT '';

ALTER TABLE "brand_kits"
  ALTER COLUMN "logo_templates" DROP DEFAULT,
  ALTER COLUMN "logo_concept"   DROP DEFAULT;
