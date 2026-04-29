-- Adds motion-reel state to ContentDraft. Nullable JSON; populated
-- when the user clicks "make a video" on a draft. Shape documented
-- in schema.prisma.

ALTER TABLE "content_drafts"
  ADD COLUMN IF NOT EXISTS "motion" JSONB;
