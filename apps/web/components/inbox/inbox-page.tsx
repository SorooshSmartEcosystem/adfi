"use client";
import { useState } from "react";
import { Card } from "../shared/card";
import { InboxView } from "./inbox-view";
import { MessageThread } from "./message-thread";
import { CallDetail } from "./call-detail";

type Selection = { id: string; kind: "thread" | "call" } | null;

export function InboxPage() {
  const [selection, setSelection] = useState<Selection>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-lg">
      <InboxView onSelect={setSelection} activeId={selection?.id} />
      <Card>
        {selection === null ? (
          <div className="text-sm text-ink3 py-lg">
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
