"use client";
import { useState, type FormEvent } from "react";
import { trpc } from "../../lib/trpc";

function timeLabel(at: Date): string {
  return at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
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
    return <div className="p-xl text-sm text-ink3 font-mono">one second</div>;
  }

  if (!query.data || query.data.length === 0) {
    return (
      <div className="p-xl text-sm text-ink3">
        this thread is empty.
      </div>
    );
  }

  const messages = query.data;
  const first = messages[0]!;

  return (
    <>
      <div className="flex items-center justify-between mb-lg">
        <div>
          <div className="font-mono text-sm text-ink4 tracking-[0.15em] mb-xs">
            {first.channel} · {timeLabel(first.createdAt)}
          </div>
          <div className="text-lg font-medium">{first.fromAddress}</div>
        </div>
        <div className="flex items-center gap-sm">
          <button
            onClick={() => takeOver.mutate({ threadId })}
            disabled={takeOver.isPending}
            className="font-mono text-xs text-ink2 border-hairline border-border rounded-full px-md py-[5px] hover:border-ink hover:text-ink transition-colors"
          >
            take over
          </button>
        </div>
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
                <div className="text-md whitespace-pre-wrap">{m.body}</div>
                <div
                  className={`font-mono text-xs mt-xs ${outbound ? "opacity-50" : "text-ink4"}`}
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
