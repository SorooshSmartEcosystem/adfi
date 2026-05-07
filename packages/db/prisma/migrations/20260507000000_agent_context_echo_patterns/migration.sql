-- Add echo_patterns JSON column to agent_context for the weekly Echo
-- pattern miner. Nullable; populated only for businesses with enough
-- published posts to mine. Read by Echo on every draft to inject
-- "what's working / what's not" guidance into the prompt.
ALTER TABLE "agent_context"
  ADD COLUMN "echo_patterns" JSONB;
