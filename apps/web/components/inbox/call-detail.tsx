"use client";
import { trpc } from "../../lib/trpc";

function timeLabel(at: Date): string {
  return at.toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

const STATUS_LABEL: Record<string, string> = {
  ANSWERED_BY_SIGNAL: "I ANSWERED THE CALL",
  ANSWERED_BY_USER: "YOU ANSWERED THIS CALL",
  MISSED_AND_RECOVERED: "I CAUGHT A MISSED CALL",
  MISSED_NO_RESPONSE: "MISSED — NO RESPONSE YET",
};

export function CallDetail({ callId }: { callId: string }) {
  const query = trpc.calls.get.useQuery({ id: callId });

  if (query.isLoading) {
    return <div className="p-xl text-sm text-ink3 font-mono">one second</div>;
  }
  if (!query.data) {
    return <div className="p-xl text-sm text-ink3">call not found.</div>;
  }

  const call = query.data;
  const intent = (call.extractedIntent ?? {}) as {
    summary?: string;
    category?: string;
  };
  const appt = call.appointments[0];

  return (
    <>
      <div className="flex items-center justify-between mb-lg">
        <div>
          <div className="font-mono text-sm text-ink4 tracking-[0.15em] mb-xs">
            CALL · {timeLabel(call.startedAt)}
          </div>
          <div className="text-lg font-medium">{call.fromNumber}</div>
        </div>
      </div>

      <div className="bg-surface rounded-2xl p-lg mb-md">
        <div className="font-mono text-sm text-ink4 tracking-[0.15em] mb-sm">
          {STATUS_LABEL[call.recoveredStatus] ?? "CALL"}
        </div>
        {intent.summary ? (
          <p className="text-md leading-relaxed">{intent.summary}</p>
        ) : (
          <p className="text-md leading-relaxed text-ink3">
            no transcript yet — check back once signal finishes processing.
          </p>
        )}
      </div>

      {appt ? (
        <div className="bg-attentionBg border-hairline border-attentionBorder rounded-2xl p-lg">
          <div className="flex items-center justify-between mb-sm">
            <span className="font-mono text-sm text-attentionText tracking-[0.15em]">
              APPOINTMENT BOOKED
            </span>
            {appt.estimatedValueCents ? (
              <span className="font-mono text-sm text-attentionText">
                EST. ${Math.round(appt.estimatedValueCents / 100)}
              </span>
            ) : null}
          </div>
          <p className="text-md font-medium">
            {appt.scheduledFor.toLocaleString("en-US", {
              weekday: "long",
              hour: "numeric",
              minute: "2-digit",
            })}
            {" · "}
            {appt.customerName}
          </p>
          {appt.notes ? (
            <p className="text-sm text-ink3 mt-xs">{appt.notes}</p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
