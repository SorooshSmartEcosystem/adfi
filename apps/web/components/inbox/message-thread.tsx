"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { trpc } from "../../lib/trpc";

function channelLabel(channel: string): string {
  if (channel === "CALL") return "call";
  if (channel === "SMS") return "text";
  if (channel === "INSTAGRAM_DM") return "ig dm";
  if (channel === "MESSENGER") return "messenger";
  if (channel === "TELEGRAM") return "telegram";
  if (channel === "EMAIL") return "email";
  return channel.toLowerCase();
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
  const scrollRef = useRef<HTMLDivElement | null>(null);

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
  const letSignalHandle = trpc.messaging.letSignalHandle.useMutation({
    onSuccess: () => utils.messaging.getThread.invalidate({ threadId }),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    sendReply.mutate({ threadId, body: reply.trim() });
  }

  // Auto-scroll to the newest message whenever the thread updates.
  const messageCount = query.data?.messages.length ?? 0;
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messageCount, threadId]);

  if (query.isLoading) {
    return <div className="p-xl text-sm text-ink3" dir="auto">one second</div>;
  }

  if (!query.data || query.data.messages.length === 0) {
    return (
      <div className="p-xl text-sm text-ink3" dir="auto">this thread is empty.</div>
    );
  }

  const messages = query.data.messages;
  const contact = query.data.contact;
  const first = messages[0]!;
  const last = messages[messages.length - 1]!;
  // Thread handoff state — once any outbound is handledBy="user", new
  // inbounds skip signal. Drive the header buttons off the latest row.
  const userHandling = last.handledBy === "user";
  const headerName = contact.displayName ?? first.fromAddress;
  const initials = (() => {
    const parts = headerName.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "?";
  })();

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-start justify-between gap-md mb-md shrink-0">
        <div className="flex items-center gap-md min-w-0">
          {contact.avatarUrl ? (
            <img
              src={contact.avatarUrl}
              alt=""
              className="w-10 h-10 rounded-full bg-surface object-cover shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-sm font-medium shrink-0" dir="auto">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-base font-medium truncate" dir="auto">{headerName}</div>
            <div className="text-xs text-ink4 mt-[2px]">
              {channelLabel(first.channel)} · {timeLabel(first.createdAt)}
            </div>
          </div>
        </div>
        {userHandling ? (
          <button
            onClick={() => letSignalHandle.mutate({ threadId })}
            disabled={letSignalHandle.isPending}
            className="text-xs text-aliveDark border-hairline border-alive rounded-full px-md py-[5px] hover:bg-alive/20 transition-colors shrink-0"
          >
            {letSignalHandle.isPending ? "handing back..." : "let signal handle"}
          </button>
        ) : (
          <button
            onClick={() => takeOver.mutate({ threadId })}
            disabled={takeOver.isPending}
            className="text-xs text-ink2 border-hairline border-border rounded-full px-md py-[5px] hover:border-ink hover:text-ink transition-colors shrink-0"
          >
            take over
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-sm pr-xs"
      >
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
                <div className="text-md whitespace-pre-wrap leading-[1.5]" dir="auto">
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

      {userHandling ? (
        <div className="text-[11px] text-ink4 mt-md shrink-0 leading-relaxed" dir="auto">
          you&apos;re handling this thread — signal won&apos;t auto-reply.
          tap &apos;let signal handle&apos; above to hand it back.
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-sm border-t-hairline border-border2 pt-md mt-md shrink-0"
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
        dir="auto">
          {sendReply.isPending ? "sending..." : "send"}
        </button>
      </form>
    </div>
  );
}
