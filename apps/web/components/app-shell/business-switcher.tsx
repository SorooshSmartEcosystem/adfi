"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../lib/trpc";

// Replaces the static business pill at the top of the sidebar with a
// dropdown trigger. Shows the active business by default; tapping
// expands a list of all businesses owned by the user, plus an "add
// new business" affordance gated by the plan's limit (SOLO/TEAM=1,
// STUDIO=2, AGENCY=8).

type Business = {
  id: string;
  name: string;
  logoUrl: string | null;
};

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "—";
}

export function BusinessSwitcher({
  active,
  planLabel,
}: {
  active: { name: string; initials: string; logoUrl?: string | null };
  planLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const router = useRouter();
  const utils = trpc.useUtils();

  const list = trpc.business.list.useQuery(undefined, {
    enabled: open,
  });
  const switchTo = trpc.business.switch.useMutation({
    onSuccess: () => {
      utils.business.list.invalidate();
      router.refresh();
    },
  });
  const create = trpc.business.create.useMutation({
    onSuccess: () => {
      utils.business.list.invalidate();
      setCreating(false);
      setDraftName("");
      router.refresh();
    },
  });

  const businesses = list.data?.businesses ?? [];
  const limit = list.data?.limit ?? 1;
  const atLimit = businesses.length >= limit;
  const planTier = list.data?.plan?.toLowerCase() ?? "trial";

  return (
    <div className="relative pb-lg hairline-b2 mb-md px-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-sm rounded-md hover:bg-surface transition-colors p-[6px] -m-[6px]"
      >
        {active.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={active.logoUrl}
            alt=""
            className="w-7 h-7 rounded-md object-cover shrink-0 bg-ink"
          />
        ) : (
          <div className="w-7 h-7 rounded-md bg-ink text-white flex items-center justify-center font-mono text-xs font-medium shrink-0">
            {active.initials}
          </div>
        )}
        <div className="flex flex-col min-w-0 flex-1 text-left">
          <div className="text-sm font-medium truncate">{active.name}</div>
          <div className="text-[11px] text-ink4 mt-[1px]">{planLabel}</div>
        </div>
        <span className="text-ink4 text-xs font-mono shrink-0">
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-full mt-[2px] bg-white border-hairline border-border rounded-[12px] z-10 shadow-sm overflow-hidden">
          {list.isLoading ? (
            <div className="px-md py-sm text-xs text-ink4">one second…</div>
          ) : (
            <>
              <div className="max-h-[260px] overflow-y-auto py-[4px]">
                {businesses.map((b: Business) => {
                  const isActive = b.id === list.data?.currentId;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      disabled={isActive || switchTo.isPending}
                      onClick={() => switchTo.mutate({ id: b.id })}
                      className={`w-full flex items-center gap-sm px-md py-[8px] text-left transition-colors ${
                        isActive
                          ? "bg-surface cursor-default"
                          : "hover:bg-surface"
                      }`}
                    >
                      {b.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={b.logoUrl}
                          alt=""
                          className="w-6 h-6 rounded-md object-cover shrink-0 bg-ink"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-md bg-ink text-white flex items-center justify-center font-mono text-[10px] font-medium shrink-0">
                          {initialsFrom(b.name)}
                        </div>
                      )}
                      <span className="text-sm truncate flex-1">{b.name}</span>
                      {isActive ? (
                        <span className="text-[10px] font-mono text-ink4 shrink-0">
                          active
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="hairline-top border-border2">
                {creating ? (
                  <div className="p-md flex flex-col gap-sm">
                    <input
                      autoFocus
                      type="text"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      placeholder="new business name"
                      className="px-md py-[7px] bg-bg border-hairline border-border rounded-md text-sm focus:outline-none focus:border-ink"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && draftName.trim()) {
                          create.mutate({ name: draftName.trim() });
                        }
                        if (e.key === "Escape") setCreating(false);
                      }}
                    />
                    <div className="flex items-center gap-sm">
                      <button
                        type="button"
                        onClick={() =>
                          draftName.trim() &&
                          create.mutate({ name: draftName.trim() })
                        }
                        disabled={!draftName.trim() || create.isPending}
                        className="bg-ink text-white text-xs px-md py-[5px] rounded-full disabled:opacity-40"
                      >
                        {create.isPending ? "creating…" : "create →"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCreating(false)}
                        className="text-xs text-ink3"
                      >
                        cancel
                      </button>
                    </div>
                    {create.error ? (
                      <p className="text-xs text-urgent">
                        {create.error.message}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => atLimit ? null : setCreating(true)}
                    disabled={atLimit}
                    className={`w-full flex items-center gap-sm px-md py-[8px] text-left transition-colors text-sm ${
                      atLimit
                        ? "text-ink4 cursor-not-allowed"
                        : "hover:bg-surface text-ink2"
                    }`}
                    title={
                      atLimit
                        ? `your ${planTier} plan supports ${limit} business${
                            limit === 1 ? "" : "es"
                          } — upgrade to add more`
                        : undefined
                    }
                  >
                    <span className="w-6 h-6 rounded-md border-hairline border-border flex items-center justify-center font-mono text-[12px] shrink-0">
                      +
                    </span>
                    <span className="flex-1">
                      {atLimit
                        ? `at limit (${businesses.length}/${limit}) · upgrade →`
                        : "add new business"}
                    </span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
