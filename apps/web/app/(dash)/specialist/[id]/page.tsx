import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@orb/auth/server";
import { trpcServer } from "../../../../lib/trpc-server";
import { AGENTS, TIER_COLOR } from "../../../../components/specialists/agent-config";
import { Card } from "../../../../components/shared/card";

function timeLabel(at: Date): string {
  const weekday = at
    .toLocaleDateString("en-US", { weekday: "short" })
    .toLowerCase();
  const time = at.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${weekday} · ${time}`;
}

export default async function SpecialistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = AGENTS[id];
  if (!agent) notFound();

  const supabase = await createServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/signin");

  let findings: { id: string; summary: string; createdAt: Date; severity: string }[] = [];
  if (agent.dbAgent && !agent.coming) {
    const trpc = await trpcServer();
    findings = await trpc.insights.listFindings({
      agent: agent.dbAgent,
      limit: 6,
    });
  }

  return (
    <>
      <div className="flex items-center gap-md mb-md flex-wrap">
        <span className="w-[12px] h-[12px] rounded-full bg-ink" />
        <h1 className="text-3xl font-medium tracking-tight">{agent.name}</h1>
        <span
          className={`font-mono text-[9px] uppercase tracking-[0.1em] text-white px-md py-[3px] rounded-full ${TIER_COLOR[agent.tier]}`}
        >
          {agent.tier}
        </span>
        {agent.coming ? (
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-attentionText bg-attentionBg border-hairline border-attentionBorder px-md py-[3px] rounded-full">
            coming soon
          </span>
        ) : null}
      </div>
      <p className="text-md text-ink3 mb-xl">{agent.role}</p>

      {agent.coming ? (
        <div className="bg-attentionBg border-hairline border-attentionBorder rounded-2xl p-lg mb-xl">
          <div className="font-mono text-sm text-attentionText tracking-[0.2em] mb-sm">
            NOT LIVE YET
          </div>
          <p className="text-md">
            i&apos;m building this one next. everyone on the{" "}
            <strong>studio</strong> plan will get it automatically when it
            ships — no upgrade needed.
          </p>
        </div>
      ) : (
        <>
          <Card className="mb-lg">
            <div className="flex items-center justify-between mb-sm">
              <div className="font-mono text-sm text-ink4 tracking-[0.2em]">
                CURRENTLY
              </div>
              <span className="font-mono text-sm text-aliveDark">ACTIVE</span>
            </div>
            <p className="text-md mb-md">{agent.currently}</p>
            <div className="h-[3px] bg-border2 rounded-sm overflow-hidden">
              <div className="h-full w-[70%] bg-ink animate-pulse-dot" />
            </div>
          </Card>

          <Card padded={false} className="mb-xl">
            <div className="px-lg py-md hairline-b2 border-border2">
              <div className="font-mono text-sm text-ink4 tracking-[0.2em]">
                RECENT FINDINGS
              </div>
            </div>
            {findings.length === 0 ? (
              <div className="px-lg py-md text-sm text-ink3">
                nothing surfaced yet — check back after{" "}
                {agent.name === "scout" ? "monday's sweep" : "the next run"}.
              </div>
            ) : (
              findings.map((f, i) => (
                <div
                  key={f.id}
                  className={`px-lg py-md ${i < findings.length - 1 ? "hairline-b2 border-border2" : ""}`}
                >
                  <div className="text-md font-medium mb-xs">{f.summary}</div>
                  <div className="font-mono text-sm text-ink4 tracking-[0.1em]">
                    {timeLabel(f.createdAt)} · {f.severity.toLowerCase()}
                  </div>
                </div>
              ))
            )}
          </Card>
        </>
      )}
    </>
  );
}
