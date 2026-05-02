"use client";
import { useState } from "react";
import { Card } from "../shared/card";
import { InboxView } from "./inbox-view";
import { MessageThread } from "./message-thread";
import { CallDetail } from "./call-detail";

type Selection = { id: string; kind: "thread" | "call" } | null;

// Master-detail layout. Desktop (lg+): list on the left, detail on the
// right, both visible. Mobile (<lg): show list OR detail, never both —
// otherwise the thread sits BELOW the list and the user has to scroll
// past every conversation to reach the messages they just clicked.
//
// The viewport-bound height + independent scroll panes prevent the
// message thread from growing the page (which would push the reply
// input below the fold).
export function InboxPage() {
  const [selection, setSelection] = useState<Selection>(null);
  const detailVisible = selection !== null;

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-lg"
      style={{ height: "calc(100vh - 240px)", minHeight: "560px" }}
    >
      {/* Inbox list — hidden on mobile when a conversation is open */}
      <div className={detailVisible ? "hidden lg:block min-h-0" : "min-h-0"}>
        <InboxView onSelect={setSelection} activeId={selection?.id} />
      </div>

      {/* Detail pane — always visible on desktop, replaces list on mobile */}
      <Card
        className={`flex flex-col min-h-0 overflow-hidden ${
          !detailVisible ? "hidden lg:flex" : ""
        }`}
        padded={false}
      >
        {/* Mobile-only back button — returns to the list */}
        {detailVisible ? (
          <button
            type="button"
            onClick={() => setSelection(null)}
            className="lg:hidden flex items-center gap-xs px-md py-sm text-sm text-ink2 hover:text-ink border-b-hairline border-border2"
            aria-label="back to conversations"
          >
            ← all conversations
          </button>
        ) : null}

        {selection === null ? (
          <div className="text-sm text-ink3 py-lg px-lg" dir="auto">
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
