import type { ReactNode } from "react";
import { Card } from "../shared/card";

export function MetricTiles({
  items,
}: {
  items: { label: string; value: string; caption: ReactNode }[];
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-lg mb-2xl">
      {items.map((m) => (
        <Card key={m.label}>
          <div className="font-mono text-sm text-ink4 mb-sm tracking-[0.2em]">
            {m.label}
          </div>
          <div className="text-3xl font-medium tracking-tight">{m.value}</div>
          <div className="text-sm text-ink3 mt-sm">{m.caption}</div>
        </Card>
      ))}
    </div>
  );
}
