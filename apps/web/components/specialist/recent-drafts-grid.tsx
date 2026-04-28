type Draft = {
  id: string;
  format: string;
  status: string;
  createdAt: Date;
  content: unknown;
};

function timeLabel(at: Date): string {
  const weekday = at
    .toLocaleDateString("en-US", { weekday: "short" })
    .toLowerCase();
  const time = at.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${weekday} · ${time}`;
}

export function RecentDraftsGrid({ drafts }: { drafts: Draft[] }) {
  return (
    <>
      <div className="flex items-center justify-between mb-md mt-sm">
        <h2 className="text-md font-medium">recent drafts</h2>
        <a
          href="/content?tab=drafts"
          className="font-mono text-[11px] text-ink2 hover:text-ink"
        >
          see all →
        </a>
      </div>

      <div className="bg-white border-hairline border-border rounded-2xl overflow-hidden">
        {drafts.length === 0 ? (
          <div className="px-lg py-xl text-center text-ink4 text-sm">
            no drafts yet — hit &lsquo;run now&rsquo; above or open /content to plan the week.
          </div>
        ) : (
          drafts.map((d, i) => {
            const c = (d.content ?? {}) as {
              caption?: string;
              subject?: string;
              coverSlide?: { title?: string };
              hook?: string;
              heroImage?: { url?: string };
            };
            const preview =
              c.caption ??
              c.subject ??
              c.coverSlide?.title ??
              c.hook ??
              "(empty)";
            const heroUrl = c.heroImage?.url;
            return (
              <div
                key={d.id}
                className={`px-xl py-lg ${
                  i < drafts.length - 1 ? "hairline-b2 border-border2" : ""
                }`}
              >
                <div className="font-mono text-[11px] text-ink4 mb-sm tracking-wider">
                  {d.format.toLowerCase().replace(/_/g, " ")} ·{" "}
                  {d.status.toLowerCase()} · {timeLabel(d.createdAt)}
                </div>
                {heroUrl ? (
                  <img
                    src={heroUrl}
                    alt=""
                    className="w-full max-w-[300px] aspect-[4/5] object-cover rounded-md mb-sm bg-border2"
                  />
                ) : null}
                <div className="text-sm leading-relaxed">
                  {preview.slice(0, 200)}
                  {preview.length > 200 ? "…" : ""}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
