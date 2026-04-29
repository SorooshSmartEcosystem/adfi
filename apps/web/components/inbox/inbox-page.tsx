"use client";
import { useState } from "react";
import { Card } from "../shared/card";
import { InboxView } from "./inbox-view";
import { MessageThread } from "./message-thread";
import { CallDetail } from "./call-detail";

type Selection = { id: string; kind: "thread" | "call" } | null;

// The whole inbox sits inside a viewport-bound flex container so the thread
// list scrolls and the message panel scrolls independently — without this
// the message-thread grows the page as messages accumulate, pushing the
// reply input down past the fold.
export function InboxPage() {
  const [selection, setSelection] = useState<Selection>(null);

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-lg"
      style={{ height: "calc(100vh - 240px)", minHeight: "560px" }}
    >
      <InboxView onSelect={setSelection} activeId={selection?.id} />
      <Card className="flex flex-col min-h-0 overflow-hidden">
        {selection === null ? (
          <div className="text-sm text-ink3 py-lg" dir="auto">
            pick a conversation to see what i said.
          </div>
        ) : selection.kind === "thread" ? (
          <MessageThread threadId={selection.id} />
        ) : (
          <CallDetail callId={selection.id} />
        )}
      </Card>
    </div>
  );
}
