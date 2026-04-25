-- A/B variants for ContentDraft. alternateContent stores a second
-- caption/draft Echo produced; chosenVariant records which one the
-- owner picked at approval time.

ALTER TABLE "content_drafts"
  ADD COLUMN "alternate_content" JSONB,
  ADD COLUMN "chosen_variant"   TEXT;
