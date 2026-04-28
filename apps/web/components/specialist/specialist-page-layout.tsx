import { SignatureOrb } from "../shared/signature-orb";
import { AgentControls } from "../specialists/agent-controls";
import { CurrentlyCard } from "./currently-card";
import type { AgentTier } from "../specialists/agent-config";

type DbAgent = "STRATEGIST" | "SCOUT" | "PULSE" | "ADS" | "ECHO" | "SIGNAL";

const TIER_PILL: Record<AgentTier, string> = {
  starter: "bg-alive/20 text-aliveDark",
  team: "bg-alive/20 text-aliveDark",
  studio: "bg-attentionBg text-attentionText",
};

const TIER_LABEL: Record<AgentTier, string> = {
  starter: "starter",
  team: "team",
  studio: "studio",
};

export function SpecialistPageLayout({
  name,
  tier,
  description,
  dbAgent,
  phrases,
  children,
}: {
  name: string;
  tier: AgentTier;
  description: string;
  dbAgent: DbAgent | null;
  phrases: string[];
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex items-center gap-md mb-sm">
        <SignatureOrb size={32} />
        <h1 className="text-2xl font-medium tracking-tight leading-none">
          {name}
          <span
            className={`inline-flex items-center px-md py-[3px] rounded-full text-xs font-medium ml-sm align-middle ${TIER_PILL[tier]}`}
          >
            {TIER_LABEL[tier]}
          </span>
        </h1>
      </div>
      <p className="text-sm text-ink3 mb-xl ml-[46px]">{description}</p>

      {dbAgent ? <AgentControls agent={dbAgent} /> : null}

      <CurrentlyCard phrases={phrases} />

      {children}
    </>
  );
}
