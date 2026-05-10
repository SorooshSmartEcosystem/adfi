-- Free-form FAQ / knowledge text injected into Signal's system prompt
-- so it can answer customer questions about hours, pricing, services,
-- policies, etc. without making things up. Single text blob (no
-- schema, no chunking) — keeps the surface tiny for v1 and fits
-- comfortably in Haiku's context.
ALTER TABLE "agent_context"
  ADD COLUMN "faq_text" TEXT;
