"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../lib/trpc";

type DbAgent = "STRATEGIST" | "SCOUT" | "PULSE" | "ADS" | "ECHO" | "SIGNAL";
type Controllable = "PULSE" | "SCOUT" | "ECHO" | "STRATEGIST";

const CONTROLLABLE: Controllable[] = ["PULSE", "SCOUT", "ECHO", "STRATEGIST"];

function isControllable(a: DbAgent): a is Controllable {
  return (CONTROLLABLE as DbAgent[]).includes(a);
}

function fmtRunTime(at: string): string {
  return new Date(at)
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .replace(" ", "")
    .toLowerCase();
}

export function AgentControls({ agent }: { agent: DbAgent }) {
  const router = useRouter();
  const [flash, setFlash] = useState<string | null>(null);
  const settings = trpc.agent.getSettings.useQuery();
  const utils = trpc.useUtils();

  const pause = trpc.agent.pause.useMutation({
    onSuccess: () => utils.agent.getSettings.invalidate(),
  });
  const resume = trpc.agent.resume.useMutation({
    onSuccess: () => utils.agent.getSettings.invalidate(),
  });
  const runNow = trpc.agent.runNow.useMutation({
    onSuccess: () => {
      setFlash("done — latest output below.");
      utils.agent.getSettings.invalidate();
      utils.content.listDrafts.invalidate();
      utils.insights.listFindings.invalidate();
      router.refresh();
      setTimeout(() => setFlash(null), 4000);
    },
    onError: (err) => {
      setFlash(`failed: ${err.message}`);
      setTimeout(() => setFlash(null), 8000);
    },
  });

  if (!isControllable(agent)) return null;

  const paused = (settings.data?.pausedAgents ?? []).includes(agent);
  const lastRun = settings.data?.lastManualRun as
    | { agent: string; at: string; ok: boolean; error: string | null }
    | null
    | undefined;
  const isThisLastRun = lastRun?.agent === agent;
  const anyPending = pause.isPending || resume.isPending || runNow.isPending;

  return (
    <div className="flex items-center gap-md mb-xl flex-wrap">
      <button
        type="button"
        onClick={() => runNow.mutate({ agent })}
        disabled={paused || anyPending}
        className="text-sm font-medium px-xl py-md rounded-full bg-ink text-white disabled:opacity-40 hover:bg-black active:scale-[0.97] transition-all inline-flex items-center gap-sm"
      >
        {runNow.isPending ? "running…" : "run now →"}
      </button>
      <button
        type="button"
        onClick={() =>
          paused ? resume.mutate({ agent }) : pause.mutate({ agent })
        }
        disabled={anyPending}
        className="text-sm font-medium px-lg py-md rounded-full bg-white text-ink border-hairline border-border hover:border-ink transition-colors disabled:opacity-40"
      >
        {paused ? "resume" : "pause"}
      </button>

      {paused ? (
        <span className="text-[11px] text-attentionText">
          paused — i won&apos;t run automatically
        </span>
      ) : null}

      {isThisLastRun && lastRun ? (
        <span
          className={`font-mono text-[11px] ml-auto inline-flex items-center gap-sm ${lastRun.ok ? "text-aliveDark" : "text-urgent"}`}
        >
          <span
            className={`w-[6px] h-[6px] rounded-full ${lastRun.ok ? "bg-alive animate-status-pulse" : "bg-urgent"}`}
          />
          last run {fmtRunTime(lastRun.at)} · {lastRun.ok ? "ok" : "failed"}
        </span>
      ) : null}

      {flash ? (
        <span className="text-[11px] text-ink3 w-full mt-xs">{flash}</span>
      ) : null}
    </div>
  );
}
