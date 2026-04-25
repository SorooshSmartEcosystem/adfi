"use client";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { Card } from "../shared/card";

function parseEmailList(raw: string): string[] {
  // Accepts CSVs, newlines, semicolons, or "Name <email@x>" rows.
  const tokens = raw.split(/[\n,;]+/).map((t) => t.trim()).filter(Boolean);
  const emails: string[] = [];
  for (const t of tokens) {
    const angle = t.match(/<([^>]+)>/);
    const raw = angle?.[1] ?? t;
    const candidate = raw.trim().toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) emails.push(candidate);
  }
  return Array.from(new Set(emails));
}

export function SubscribersCard() {
  const [importOpen, setImportOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [bulkInput, setBulkInput] = useState("");
  const utils = trpc.useUtils();

  const list = trpc.subscribers.list.useQuery();
  const add = trpc.subscribers.add.useMutation({
    onSuccess: () => {
      setEmailInput("");
      setNameInput("");
      utils.subscribers.list.invalidate();
    },
  });
  const importBulk = trpc.subscribers.importBulk.useMutation({
    onSuccess: () => {
      setBulkInput("");
      setImportOpen(false);
      utils.subscribers.list.invalidate();
    },
  });
  const remove = trpc.subscribers.remove.useMutation({
    onSuccess: () => utils.subscribers.list.invalidate(),
  });

  const items = list.data?.items ?? [];
  const counts = list.data?.countByStatus ?? {
    ACTIVE: 0,
    UNSUBSCRIBED: 0,
    BOUNCED: 0,
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-md flex-wrap gap-sm">
        <div>
          <div className="text-lg font-medium">your newsletter list</div>
          <div className="font-mono text-sm text-ink4 mt-xs">
            {counts.ACTIVE} active · {counts.UNSUBSCRIBED} unsubscribed
          </div>
        </div>
        <button
          type="button"
          onClick={() => setImportOpen((v) => !v)}
          className="font-mono text-xs text-ink2 border-hairline border-border rounded-full px-md py-[5px] hover:border-ink hover:text-ink transition-colors"
        >
          {importOpen ? "close importer" : "import csv"}
        </button>
      </div>

      <div className="flex items-center gap-sm flex-wrap mb-md">
        <input
          type="email"
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          placeholder="email@customer.com"
          className="flex-1 min-w-[220px] px-md py-[10px] bg-bg border-hairline border-border rounded-full text-sm focus:outline-none focus:border-ink"
        />
        <input
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="name (optional)"
          className="px-md py-[10px] bg-bg border-hairline border-border rounded-full text-sm focus:outline-none focus:border-ink"
        />
        <button
          type="button"
          onClick={() =>
            add.mutate({
              email: emailInput.trim().toLowerCase(),
              ...(nameInput.trim() && { name: nameInput.trim() }),
            })
          }
          disabled={add.isPending || !emailInput.trim()}
          className="bg-ink text-white font-mono text-xs px-md py-[10px] rounded-full disabled:opacity-40"
        >
          {add.isPending ? "adding..." : "add →"}
        </button>
      </div>
      {add.error ? (
        <p className="text-sm text-urgent font-mono mb-md">
          {add.error.message}
        </p>
      ) : null}

      {importOpen ? (
        <div className="bg-bg border-hairline border-border rounded-md p-md mb-md">
          <div className="font-mono text-xs text-ink4 tracking-[0.15em] mb-sm">
            PASTE EMAILS · ONE PER LINE OR CSV
          </div>
          <textarea
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            rows={5}
            placeholder="alice@example.com&#10;bob@example.com&#10;carol@example.com"
            className="w-full px-md py-sm bg-white border-hairline border-border rounded-md text-sm font-mono focus:outline-none focus:border-ink mb-sm"
          />
          <div className="flex items-center gap-sm">
            <button
              type="button"
              onClick={() => {
                const emails = parseEmailList(bulkInput);
                if (emails.length === 0) return;
                importBulk.mutate({ emails });
              }}
              disabled={importBulk.isPending || !bulkInput.trim()}
              className="bg-ink text-white font-mono text-xs px-md py-[7px] rounded-full disabled:opacity-40"
            >
              {importBulk.isPending ? "importing..." : "import →"}
            </button>
            {importBulk.data ? (
              <span className="font-mono text-xs text-aliveDark">
                +{importBulk.data.added} new · {importBulk.data.reactivated}{" "}
                reactivated · {importBulk.data.skipped} skipped
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {list.isLoading ? (
        <p className="text-sm text-ink3 font-mono">one second</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-ink3">
          your list is empty — add your first subscriber above, or paste a
          batch via &lsquo;import csv&rsquo;.
        </p>
      ) : (
        <div className="flex flex-col">
          {items.slice(0, 100).map((s, i) => (
            <div
              key={s.id}
              className={`flex items-center justify-between px-sm py-sm ${i < items.length - 1 ? "hairline-b2 border-border2" : ""}`}
            >
              <div className="min-w-0 flex-1 mr-md">
                <div className="text-sm truncate">
                  {s.email}
                  {s.name ? (
                    <span className="text-ink4 ml-sm">({s.name})</span>
                  ) : null}
                </div>
                <div className="font-mono text-xs text-ink4">
                  {new Date(s.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                  {s.source ? ` · ${s.source}` : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove.mutate({ id: s.id })}
                disabled={remove.isPending}
                className="font-mono text-[10px] text-ink4 hover:text-urgent transition-colors"
              >
                remove
              </button>
            </div>
          ))}
          {items.length > 100 ? (
            <div className="text-sm text-ink4 font-mono mt-sm">
              and {items.length - 100} more — pagination coming soon
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}
