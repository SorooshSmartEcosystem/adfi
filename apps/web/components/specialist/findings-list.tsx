type Severity = "INFO" | "NEEDS_ATTENTION" | "URGENT";

type Finding = {
  id: string;
  summary: string;
  createdAt: Date;
  severity: string;
};

function timeLabel(at: Date): string {
  const weekday = at
    .toLocaleDateString("en-US", { weekday: "short" })
    .toLowerCase();
  const time = at
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .toUpperCase();
  return `${weekday} · ${time}`;
}

const DOT_CLASS: Record<Severity, string> = {
  INFO: "bg-ink5",
  NEEDS_ATTENTION: "bg-attentionBorder",
  URGENT: "bg-urgent",
};

const TAG_CLASS: Record<Severity, string> = {
  INFO: "bg-surface text-ink3",
  NEEDS_ATTENTION: "bg-attentionBg text-attentionText",
  URGENT: "bg-attentionBg text-urgent",
};

const TAG_LABEL: Record<Severity, string> = {
  INFO: "info",
  NEEDS_ATTENTION: "needs_attention",
  URGENT: "urgent",
};

export function FindingsList({
  findings,
  emptyHint,
  title = "recent findings",
}: {
  findings: Finding[];
  emptyHint: string;
  title?: string;
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-md mt-sm">
        <h2 className="text-md font-medium">{title}</h2>
        <span className="font-mono text-[11px] text-ink4">
          {findings.length} surfaced
        </span>
      </div>

      <div className="bg-white border-hairline border-border rounded-2xl overflow-hidden">
        {findings.length === 0 ? (
          <div className="px-lg py-xl text-center text-ink4 text-sm">
            {emptyHint}
          </div>
        ) : (
          findings.map((f, i) => {
            const sev = (f.severity as Severity) ?? "INFO";
            return (
              <div
                key={f.id}
                className={`px-xl py-lg flex items-start gap-md cursor-default hover:bg-surface2 transition-colors ${
                  i < findings.length - 1
                    ? "hairline-b2 border-border2"
                    : ""
                }`}
              >
                <span
                  className={`w-[7px] h-[7px] rounded-full flex-shrink-0 mt-[8px] ${DOT_CLASS[sev]}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-snug mb-xs">
                    {f.summary}
                  </div>
                  <div className="flex items-center gap-md text-[12px] text-ink4">
                    <span className="font-mono">{timeLabel(f.createdAt)}</span>
                    <span
                      className={`font-mono text-[10px] px-sm py-[2px] rounded-full tracking-wider ${TAG_CLASS[sev]}`}
                    >
                      {TAG_LABEL[sev]}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
