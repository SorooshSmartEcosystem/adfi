"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../lib/trpc";
import { Card } from "../shared/card";
import { StatusDot } from "../shared/status-dot";

const FORMAT_LABEL: Record<string, string> = {
  SINGLE_POST: "single post",
  CAROUSEL: "carousel",
  REEL_SCRIPT: "reel",
  EMAIL_NEWSLETTER: "email",
  STORY_SEQUENCE: "stories",
};

const PLATFORM_LABEL: Record<string, string> = {
  INSTAGRAM: "ig",
  LINKEDIN: "li",
  EMAIL: "email",
  FACEBOOK: "fb",
  PINTEREST: "pin",
};

const INTENT_LABEL: Record<string, string> = {
  build_trust: "trust",
  drive_inquiry: "inquiry",
  drive_sale: "sale",
  build_authority: "authority",
  build_community: "community",
};

function dayLabel(d: Date): string {
  return d
    .toLocaleDateString("en-US", { weekday: "short" })
    .toUpperCase();
}

function timeLabel(d: Date): string {
  return d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .toLowerCase()
    .replace(" ", "");
}

export function PlanPanel() {
  const router = useRouter();
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const planQuery = trpc.content.getCurrentPlan.useQuery();
  const generate = trpc.content.generatePlan.useMutation({
    onSuccess: () => utils.content.getCurrentPlan.invalidate(),
  });
  const draftItem = trpc.content.draftPlanItem.useMutation({
    onSuccess: () => {
      utils.content.getCurrentPlan.invalidate();
      utils.content.listDrafts.invalidate();
      router.refresh();
    },
  });
  const skipItem = trpc.content.skipPlanItem.useMutation({
    onSuccess: () => utils.content.getCurrentPlan.invalidate(),
  });

  if (planQuery.isLoading) {
    return (
      <div className="text-sm text-ink3">one second</div>
    );
  }

  const plan = planQuery.data;

  if (!plan) {
    return (
      <Card>
        <div className="text-xs text-ink4 mb-sm">
          NO PLAN YET FOR THIS WEEK
        </div>
        <p className="text-md leading-relaxed mb-md">
          let me look at what&apos;s working and pitch you a 3–5 post plan
          for the week. you&apos;ll approve each draft individually.
        </p>
        <button
          type="button"
          onClick={() => generate.mutate({})}
          disabled={generate.isPending}
          className="bg-ink text-white text-xs px-md py-[10px] rounded-full disabled:opacity-40"
        >
          {generate.isPending ? "thinking..." : "plan this week →"}
        </button>
        {generate.error ? (
          <p className="text-sm text-urgent mt-sm">
            {generate.error.message}
          </p>
        ) : null}
      </Card>
    );
  }

  const reasoning = (plan.reasoning ?? {}) as {
    biggestBet?: string;
    gapsSpotted?: string[];
  };

  return (
    <>
      <Card className="mb-lg">
        <div className="text-xs text-ink4 mb-sm">
          THIS WEEK&apos;S THESIS
        </div>
        <p className="text-lg leading-relaxed font-medium mb-md">
          {plan.thesis}
        </p>
        {reasoning.biggestBet ? (
          <div className="mb-md">
            <div className="text-[11px] text-aliveDark mb-xs">
              ● BIGGEST BET
            </div>
            <p className="text-sm text-ink2">{reasoning.biggestBet}</p>
          </div>
        ) : null}
        {reasoning.gapsSpotted && reasoning.gapsSpotted.length > 0 ? (
          <div>
            <div className="text-[11px] text-attentionText mb-xs">
              ● WHAT I NOTICED
            </div>
            <ul className="text-sm text-ink2 flex flex-col gap-xs">
              {reasoning.gapsSpotted.map((g, i) => (
                <li key={i}>· {g}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-md pt-md border-t-hairline border-border2 flex items-center gap-md">
          <button
            type="button"
            onClick={() => generate.mutate({})}
            disabled={generate.isPending}
            className="text-xs text-ink2 border-hairline border-border rounded-full px-md py-[5px] hover:border-ink hover:text-ink transition-colors disabled:opacity-40"
          >
            {generate.isPending ? "rethinking..." : "redo plan"}
          </button>
        </div>
      </Card>

      <div className="text-xs text-ink4 mb-md">
        SLOTS · {plan.items.length}
      </div>

      <div className="flex flex-col gap-sm">
        {plan.items.map((item) => {
          const open = openItemId === item.id;
          const draftedStatus = item.draft?.status;
          const isDrafted = item.status === "DRAFTED" || draftedStatus !== undefined;
          const isSkipped = item.status === "SKIPPED";
          return (
            <Card key={item.id} className={isSkipped ? "opacity-50" : ""}>
              <button
                type="button"
                onClick={() => setOpenItemId(open ? null : item.id)}
                className="w-full text-left flex items-center justify-between gap-md mb-sm"
              >
                <div className="flex items-center gap-md flex-wrap min-w-0">
                  <span className="text-xs text-ink shrink-0">
                    {dayLabel(item.scheduledFor)} · {timeLabel(item.scheduledFor)}
                  </span>
                  <span className="text-xs text-ink4">
                    {PLATFORM_LABEL[item.platform] ?? item.platform.toLowerCase()} ·{" "}
                    {FORMAT_LABEL[item.format] ?? item.format.toLowerCase()}
                  </span>
                  <span className="text-xs text-ink4">
                    {INTENT_LABEL[item.intent] ?? item.intent}
                  </span>
                </div>
                <div className="flex items-center gap-sm shrink-0">
                  {isSkipped ? (
                    <span className="text-[11px] text-ink5">
                      SKIPPED
                    </span>
                  ) : isDrafted ? (
                    <>
                      <StatusDot tone="alive" />
                      <span className="text-[11px] text-aliveDark">
                        DRAFTED
                      </span>
                    </>
                  ) : (
                    <>
                      <StatusDot tone="neutral" />
                      <span className="text-[11px] text-ink4">
                        PLANNED
                      </span>
                    </>
                  )}
                </div>
              </button>

              <div className="text-md font-medium mb-xs">{item.angle}</div>
              <p className="text-sm text-ink3 mb-sm italic">
                hook idea: &ldquo;{item.hookIdea}&rdquo;
              </p>

              {open ? (
                <div className="pt-sm border-t-hairline border-border2">
                  <div className="text-[11px] text-ink4 mb-xs">
                    WHY THIS SLOT
                  </div>
                  <p className="text-sm text-ink2 mb-md">{item.reasoning}</p>
                  <div className="flex items-center gap-sm flex-wrap">
                    {!isDrafted && !isSkipped ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            draftItem.mutate({ itemId: item.id })
                          }
                          disabled={draftItem.isPending}
                          className="bg-ink text-white text-xs font-medium px-md py-[7px] rounded-full disabled:opacity-40"
                        >
                          {draftItem.isPending &&
                          draftItem.variables?.itemId === item.id
                            ? "echo is writing..."
                            : "draft this →"}
                        </button>
                        <button
                          type="button"
                          onClick={() => skipItem.mutate({ itemId: item.id })}
                          disabled={skipItem.isPending}
                          className="text-xs text-ink2 border-hairline border-border rounded-full px-md py-[6px] hover:border-ink hover:text-ink transition-colors disabled:opacity-40"
                        >
                          skip
                        </button>
                      </>
                    ) : null}
                    {isDrafted && item.draft ? (
                      <a
                        href="/content?tab=drafts"
                        className="text-xs text-aliveDark border-hairline border-aliveDark rounded-full px-md py-[6px] hover:opacity-80 transition-opacity"
                      >
                        review draft →
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    </>
  );
}
