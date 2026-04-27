"use client";
import { useState, type FormEvent } from "react";
import { trpc } from "../../lib/trpc";

function channelLabel(channel: string): string {
  if (channel === "CALL") return "call";
  if (channel === "SMS") return "text";
  if (channel === "INSTAGRAM_DM") return "ig dm";
  if (channel === "MESSENGER") return "messenger";
  return "email";
}

function timeLabel(at: Date): string {
  return at
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .replace(" ", "")
    .toLowerCase();
}

export function MessageThread({ threadId }: { threadId: string }) {
  const utils = trpc.useUtils();
  const query = trpc.messaging.getThread.useQuery({ threadId });
  const [reply, setReply] = useState("");

  const sendReply = trpc.messaging.sendReply.useMutation({
    onSuccess: () => {
      setReply("");
      utils.messaging.getThread.invalidate({ threadId });
      utils.messaging.inboxFeed.invalidate();
    },
  });

  const takeOver = trpc.messaging.takeOver.useMutation({
    onSuccess: () => utils.messaging.getThread.invalidate({ threadId }),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    sendReply.mutate({ threadId, body: reply.trim() });
  }

  if (query.isLoading) {
    return <div className="p-xl text-sm text-ink3">one second</div>;
  }

  if (!query.data || query.data.messages.length === 0) {
    return (
      <div className="p-xl text-sm text-ink3">this thread is empty.</div>
    );
  }

  const messages = query.data.messages;
  const contact = query.data.contact;
  const first = messages[0]!;
  const headerName = contact.displayName ?? first.fromAddress;
  const initials = (() => {
    const parts = headerName.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "?";
  })();

  return (
    <>
      <div className="flex items-start justify-between gap-md mb-lg">
        <div className="flex items-center gap-md min-w-0">
          {contact.avatarUrl ? (
            <img
              src={contact.avatarUrl}
              alt=""
              className="w-10 h-10 rounded-full bg-surface object-cover shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-sm font-medium shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-base font-medium truncate">{headerName}</div>
            <div className="text-xs text-ink4 mt-[2px]">
              {channelLabel(first.channel)} · {timeLabel(first.createdAt)}
            </div>
          </div>
        </div>
        <button
          onClick={() => takeOver.mutate({ threadId })}
          disabled={takeOver.isPending}
          className="text-xs text-ink2 border-hairline border-border rounded-full px-md py-[5px] hover:border-ink hover:text-ink transition-colors shrink-0"
        >
          take over
        </button>
      </div>

      <div className="flex flex-col gap-sm mb-lg">
        {messages.map((m) => {
          const outbound = m.direction === "OUTBOUND";
          return (
            <div
              key={m.id}
              className={`flex ${outbound ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] px-md py-sm ${
                  outbound
                    ? "bg-ink text-white rounded-[16px_16px_4px_16px]"
                    : "bg-surface rounded-[16px_16px_16px_4px]"
                }`}
              >
                <div className="text-md whitespace-pre-wrap leading-[1.5]">
                  {m.body}
                </div>
                <div
                  className={`text-[11px] mt-xs ${outbound ? "opacity-50" : "text-ink4"}`}
                >
                  {outbound ? "me" : "them"} · {timeLabel(m.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-sm border-t-hairline border-border2 pt-md"
      >
        <input
          type="text"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="type a reply..."
          disabled={sendReply.isPending}
          className="flex-1 px-md py-[10px] bg-bg border-hairline border-border rounded-full text-sm focus:outline-none focus:border-ink"
        />
        <button
          type="submit"
          disabled={sendReply.isPending || !reply.trim()}
          className="px-lg py-[10px] bg-ink text-white rounded-full text-sm font-medium disabled:opacity-40"
        >
          {sendReply.isPending ? "sending..." : "send"}
        </button>
      </form>
    </>
  );
}
