"use client";

import { useState, useTransition } from "react";
import {
  purchaseNumberAction,
  releaseNumberAction,
  syncWebhooksAction,
} from "./actions";

export function PurchaseForm() {
  const [businessId, setBusinessId] = useState("");
  const [areaCode, setAreaCode] = useState("");
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        await purchaseNumberAction({
          businessId: businessId.trim(),
          areaCode: areaCode ? Number(areaCode) : undefined,
        });
        setBusinessId("");
        setAreaCode("");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-md p-lg bg-surface border-hairline border-border rounded-lg"
    >
      <div className="flex flex-col gap-xs">
        <label className="text-xs font-mono text-ink3 uppercase tracking-widest">
          business id
        </label>
        <input
          type="text"
          value={businessId}
          onChange={(e) => setBusinessId(e.target.value)}
          placeholder="00000000-0000-0000-0000-000000000000"
          className="px-md py-sm bg-bg border-hairline border-border rounded-md text-sm font-mono"
          required
        />
      </div>
      <div className="flex flex-col gap-xs">
        <label className="text-xs font-mono text-ink3 uppercase tracking-widest">
          area code (optional)
        </label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]{3}"
          value={areaCode}
          onChange={(e) => setAreaCode(e.target.value)}
          placeholder="415"
          className="px-md py-sm bg-bg border-hairline border-border rounded-md text-sm font-mono w-32"
        />
      </div>
      <button
        type="submit"
        disabled={isPending || !businessId.trim()}
        className="self-start text-xs font-mono px-md py-sm rounded-full border-hairline border-alive text-alive hover:bg-alive hover:text-bg disabled:opacity-40 transition-colors"
      >
        {isPending ? "buying…" : "buy + assign (~$1.15/mo)"}
      </button>
      {error ? (
        <p className="text-[11px] font-mono text-urgent">{error}</p>
      ) : null}
    </form>
  );
}

export function RowActions({
  id,
  status,
}: {
  id: string;
  status: "ACTIVE" | "SUSPENDED" | "RELEASED";
}) {
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function release() {
    if (!confirm("Release this number? Twilio stops billing immediately.")) {
      return;
    }
    setError(null);
    start(async () => {
      try {
        await releaseNumberAction(id);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  function sync() {
    setError(null);
    start(async () => {
      try {
        await syncWebhooksAction(id);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-xs">
      <div className="flex items-center gap-sm">
        {status === "ACTIVE" ? (
          <>
            <button
              type="button"
              onClick={sync}
              disabled={isPending}
              className="text-[11px] font-mono px-sm py-[5px] rounded-full border-hairline border-ink3 text-ink3 hover:border-ink hover:text-ink disabled:opacity-40"
            >
              sync webhooks
            </button>
            <button
              type="button"
              onClick={release}
              disabled={isPending}
              className="text-[11px] font-mono px-sm py-[5px] rounded-full border-hairline border-urgent text-urgent hover:bg-urgent hover:text-bg disabled:opacity-40"
            >
              {isPending ? "…" : "release"}
            </button>
          </>
        ) : (
          <span className="text-[11px] font-mono text-ink4">{status.toLowerCase()}</span>
        )}
      </div>
      {error ? (
        <p className="text-[10px] font-mono text-urgent">{error}</p>
      ) : null}
    </div>
  );
}
