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
      setFlash("done — latest findings below.");
      utils.agent.getSettings.invalidate();
      router.refresh();
      setTimeout(() => setFlash(null), 4000);
    },
    onError: (err) => {
      setFlash(`failed: ${err.message}`);
      setTimeout(() => setFlash(null), 8000);
    },
  });

  if (!isControllable(agent)) {
    return null;
  }

  const paused = (settings.data?.pausedAgents ?? []).includes(agent);
  const lastRun = settings.data?.lastManualRun as
    | {
        agent: string;
        at: string;
        ok: boolean;
        error: string | null;
        durationMs?: number;
      }
    | null
    | undefined;
  const isThisLastRun = lastRun?.agent === agent;
  const anyPending = pause.isPending || resume.isPending || runNow.isPending;

  return (
    <div className="flex items-center gap-sm flex-wrap mb-lg">
      <button
        type="button"
        onClick={() => runNow.mutate({ agent })}
        disabled={paused || anyPending}
        className="font-mono text-xs px-md py-[7px] rounded-full bg-ink text-white disabled:opacity-40 hover:opacity-85 transition-opacity"
      >
        {runNow.isPending ? "running..." : "run now →"}
      </button>
      <button
        type="button"
        onClick={() =>
          paused ? resume.mutate({ agent }) : pause.mutate({ agent })
        }
        disabled={anyPending}
        className="font-mono text-xs text-ink2 border-hairline border-border rounded-full px-md py-[6px] hover:border-ink hover:text-ink transition-colors disabled:opacity-40"
      >
        {paused ? "resume agent" : "pause agent"}
      </button>

      {paused ? (
        <span className="font-mono text-[10px] text-attentionText tracking-[0.15em]">
          PAUSED · i won&apos;t run automatically
        </span>
      ) : null}

      {isThisLastRun && lastRun ? (
        <span
          className={`font-mono text-[10px] tracking-[0.1em] ml-auto ${lastRun.ok ? "text-aliveDark" : "text-urgent"}`}
        >
          last run {new Date(lastRun.at).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}{" "}
          · {lastRun.ok ? "ok" : "failed"}
        </span>
      ) : null}

      {flash ? (
        <span className="font-mono text-[10px] text-ink3 w-full mt-xs">
          {flash}
        </span>
      ) : null}
    </div>
  );
}
