-- Agent pause/resume + manual run tracking.
-- Adds paused_agents (array of Agent enum) and last_manual_run (JSON:
-- { agent: Agent, at: ISO string, result?: unknown }).

ALTER TABLE "agent_context"
  ADD COLUMN "paused_agents" "Agent"[] NOT NULL DEFAULT ARRAY[]::"Agent"[],
  ADD COLUMN "last_manual_run" JSONB;
