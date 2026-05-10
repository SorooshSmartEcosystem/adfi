import Link from "next/link";
import { trpcServer } from "../../../lib/trpc-server";
import { PurchaseForm, RowActions } from "./forms";

export const dynamic = "force-dynamic";

export default async function NumbersPage() {
  const trpc = await trpcServer();
  const numbers = await trpc.admin.listPhoneNumbers();

  const active = numbers.filter((n) => n.status === "ACTIVE");

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-2xl">
      <div className="flex flex-col gap-sm">
        <p className="text-xs font-mono text-ink3 uppercase tracking-widest">
          twilio
        </p>
        <h1 className="text-2xl font-medium">phone numbers</h1>
        <p className="text-xs font-mono text-ink4">
          {active.length} active · ~${(active.length * 1.15).toFixed(2)}/mo
        </p>
      </div>

      <section className="flex flex-col gap-md">
        <h2 className="text-sm font-medium">buy + assign</h2>
        <PurchaseForm />
      </section>

      <section className="flex flex-col gap-md">
        <h2 className="text-sm font-medium">all numbers</h2>
        {numbers.length === 0 ? (
          <p className="text-xs font-mono text-ink4">none yet.</p>
        ) : (
          <div className="flex flex-col gap-xs">
            {numbers.map((n) => (
              <div
                key={n.id}
                className="flex items-center justify-between bg-surface border-hairline border-border rounded-lg px-lg py-md"
              >
                <div className="flex flex-col gap-xs">
                  <p className="text-sm font-mono">{n.number}</p>
                  <p className="text-[11px] font-mono text-ink3">
                    {n.business?.name ?? "(no business)"}
                    {" · "}
                    <Link
                      href={`/dashboard/users/${n.user.id}`}
                      className="underline hover:text-ink"
                    >
                      {n.user.email ?? n.user.businessName ?? n.user.id}
                    </Link>
                  </p>
                </div>
                <RowActions
                  id={n.id}
                  status={n.status as "ACTIVE" | "SUSPENDED" | "RELEASED"}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
