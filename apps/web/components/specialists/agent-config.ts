export type AgentTier = "starter" | "team" | "studio";

export type AgentDef = {
  id: string;
  name: string;
  tier: AgentTier;
  role: string;
  currently: string;
  coming: boolean;
  dbAgent: "STRATEGIST" | "SCOUT" | "PULSE" | "ADS" | "ECHO" | "SIGNAL" | null;
};

export const AGENTS: Record<string, AgentDef> = {
  strategist: {
    id: "strategist",
    name: "strategist",
    tier: "starter",
    role: "business structure · brand voice · weekly plan",
    currently: "refreshing your brand voice based on recent posts",
    coming: false,
    dbAgent: "STRATEGIST",
  },
  signal: {
    id: "signal",
    name: "signal",
    tier: "starter",
    role: "calls · sms · dms · appointments",
    currently: "monitoring your adfi number for calls and texts",
    coming: false,
    dbAgent: "SIGNAL",
  },
  echo: {
    id: "echo",
    name: "echo",
    tier: "team",
    role: "content creation · posting · performance",
    currently: "drafting your next 3 posts based on this week's performance",
    coming: false,
    dbAgent: "ECHO",
  },
  scout: {
    id: "scout",
    name: "scout",
    tier: "team",
    role: "competitor tracking · market intel",
    currently: "running weekly competitor sweep",
    coming: false,
    dbAgent: "SCOUT",
  },
  pulse: {
    id: "pulse",
    name: "pulse",
    tier: "team",
    role: "market signals · news · trends",
    currently: "watching signals relevant to your business",
    coming: false,
    dbAgent: "PULSE",
  },
  ads: {
    id: "ads",
    name: "ads",
    tier: "studio",
    role: "paid campaigns · meta + google + youtube",
    currently: "",
    coming: false,
    dbAgent: "ADS",
  },
  site: {
    id: "site",
    name: "site",
    tier: "studio",
    role: "website building · landing pages",
    currently: "",
    coming: true,
    dbAgent: null,
  },
};

export const TIER_COLOR: Record<AgentTier, string> = {
  starter: "bg-aliveDark",
  team: "bg-ink",
  studio: "bg-attentionText",
};
