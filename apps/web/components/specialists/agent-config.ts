export type AgentTier = "starter" | "team" | "studio";

export type AgentDef = {
  id: string;
  name: string;
  tier: AgentTier;
  role: string;
  // Rotating micro-status phrases shown in the "currently" card on each
  // specialist page. Cycles every 4s with a 400ms fade. 5–6 entries each.
  phrases: string[];
  coming: boolean;
  dbAgent: "STRATEGIST" | "SCOUT" | "PULSE" | "ADS" | "ECHO" | "SIGNAL" | null;
};

export const AGENTS: Record<string, AgentDef> = {
  strategist: {
    id: "strategist",
    name: "strategist",
    tier: "starter",
    role: "business structure · brand voice · weekly plan",
    phrases: [
      "refreshing your brand voice from this week's posts",
      "comparing your tone with what's converting",
      "checking which content pillars are pulling weight",
      "looking at what your audience actually responds to",
      "matching your voice to upcoming content",
      "summarizing what i learned",
    ],
    coming: false,
    dbAgent: "STRATEGIST",
  },
  signal: {
    id: "signal",
    name: "signal",
    tier: "starter",
    role: "calls · sms · dms · appointments",
    phrases: [
      "monitoring your business number for calls and texts",
      "reading new dms across your channels",
      "drafting replies in your voice",
      "checking which leads are warm",
      "booking appointments where i can",
      "summarizing what came in today",
    ],
    coming: false,
    dbAgent: "SIGNAL",
  },
  echo: {
    id: "echo",
    name: "echo",
    tier: "team",
    role: "content creation · posting · performance",
    phrases: [
      "drafting your next 3 posts based on this week's performance",
      "designing hero photos for the drafts",
      "writing captions in your voice",
      "checking which formats are converting for you",
      "scheduling the week ahead",
      "summarizing what's queued",
    ],
    coming: false,
    dbAgent: "ECHO",
  },
  scout: {
    id: "scout",
    name: "scout",
    tier: "team",
    role: "competitor tracking · market intel",
    phrases: [
      "running this week's competitor sweep",
      "watching what your top 3 rivals just posted",
      "looking for pricing or offer changes",
      "checking which of their posts are taking off",
      "spotting gaps you could fill",
      "summarizing what i found",
    ],
    coming: false,
    dbAgent: "SCOUT",
  },
  pulse: {
    id: "pulse",
    name: "pulse",
    tier: "team",
    role: "market signals · news · trends",
    phrases: [
      "watching signals relevant to your business",
      "scanning trending topics across tiktok and x",
      "checking news mentions in your industry",
      "looking for press opportunities you could pitch",
      "matching trends to your audience",
      "summarizing what i found",
    ],
    coming: false,
    dbAgent: "PULSE",
  },
  ads: {
    id: "ads",
    name: "ads",
    tier: "studio",
    role: "paid campaigns · facebook · google · tiktok",
    phrases: [
      "watching your active campaigns across facebook and google",
      "checking which ads are pulling cheap clicks",
      "drafting fresh creative for the next test",
      "rebalancing budget toward what's working",
      "spotting fatigue before it eats your budget",
      "summarizing this week's spend",
    ],
    coming: false,
    dbAgent: "ADS",
  },
};

export const TIER_COLOR: Record<AgentTier, string> = {
  starter: "bg-aliveDark",
  team: "bg-ink",
  studio: "bg-attentionText",
};
