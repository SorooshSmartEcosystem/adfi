"use client";
import { trpc } from "../../lib/trpc";

function timeLabel(at: Date): string {
  const day = at.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
  const time = at
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .replace(" ", "")
    .toLowerCase();
  return `${day} ${time}`;
}

const STATUS_LEAD: Record<string, string> = {
  ANSWERED_BY_SIGNAL: "i answered the call.",
  ANSWERED_BY_USER: "you answered this one yourself.",
  MISSED_AND_RECOVERED: "i caught a missed call.",
  MISSED_NO_RESPONSE: "missed call — no response yet.",
};

export function CallDetail({ callId }: { callId: string }) {
  const query = trpc.calls.get.useQuery({ id: callId });

  if (query.isLoading) {
    return <div className="p-xl text-sm text-ink3">one second</div>;
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
      <div className="flex items-start justify-between gap-md mb-lg">
        <div className="min-w-0">
          <div className="text-base font-medium truncate">{call.fromNumber}</div>
          <div className="text-xs text-ink4 mt-[2px]">
            call · {timeLabel(call.startedAt)}
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-[14px] p-lg mb-md">
        <div className="text-sm font-medium mb-sm">
          {STATUS_LEAD[call.recoveredStatus] ?? "call."}
        </div>
        {intent.summary ? (
          <p className="text-sm text-ink2 leading-[1.6]">{intent.summary}</p>
        ) : (
          <p className="text-sm text-ink3 leading-[1.6]">
            no transcript yet — check back once i finish processing.
          </p>
        )}
      </div>

      {appt ? (
        <div className="bg-attentionBg border-hairline border-attentionBorder rounded-[14px] p-lg">
          <div className="flex items-center justify-between mb-sm">
            <span className="text-xs text-attentionText">appointment booked</span>
            {appt.estimatedValueCents ? (
              <span className="text-xs text-attentionText">
                est. ${Math.round(appt.estimatedValueCents / 100)}
              </span>
            ) : null}
          </div>
          <p className="text-sm font-medium leading-[1.5]">
            {appt.scheduledFor
              .toLocaleString("en-US", {
                weekday: "long",
                hour: "numeric",
                minute: "2-digit",
              })
              .toLowerCase()}{" "}
            · {appt.customerName}
          </p>
          {appt.notes ? (
            <p className="text-xs text-ink3 mt-xs leading-[1.5]">{appt.notes}</p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
