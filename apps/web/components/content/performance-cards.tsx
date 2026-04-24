import { Card } from "../shared/card";

type BestPost = {
  platform: string;
  title: string;
  publishedAt: Date;
  reach: number;
} | null;

export function PerformanceCards({
  bestPost,
  insights,
}: {
  bestPost: BestPost;
  insights: { label: string; deltaPct: number }[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-lg mb-xl">
      <Card>
        <div className="font-mono text-sm text-ink4 tracking-[0.2em] mb-sm">
          BEST POST THIS MONTH
        </div>
        {bestPost ? (
          <>
            <div className="h-[120px] bg-gradient-to-br from-surface to-border rounded-md mb-md flex items-center justify-center">
              <span className="font-mono text-sm text-ink4">
                {bestPost.platform} · {bestPost.title.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-md font-medium">{bestPost.title}</div>
                <div className="font-mono text-sm text-ink4 mt-xs">
                  {bestPost.publishedAt
                    .toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                    .toUpperCase()}{" "}
                  · {bestPost.platform}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-medium">
                  {bestPost.reach >= 1000
                    ? `${(bestPost.reach / 1000).toFixed(1).replace(/\.0$/, "")}k`
                    : bestPost.reach}
                </div>
                <div className="font-mono text-sm text-ink4">REACH</div>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-ink3">
            nothing published yet — your first post will show up here.
          </p>
        )}
      </Card>

      <Card>
        <div className="font-mono text-sm text-ink4 tracking-[0.2em] mb-sm">
          WHAT&apos;S WORKING
        </div>
        {insights.length === 0 ? (
          <p className="text-sm text-ink3">
            i&apos;ll surface what&apos;s working once you&apos;ve published a
            few posts.
          </p>
        ) : (
          <div className="flex flex-col gap-sm">
            {insights.map((i) => (
              <div key={i.label} className="flex items-center justify-between">
                <span className="text-sm">{i.label}</span>
                <span
                  className={`font-mono text-sm ${i.deltaPct >= 0 ? "text-aliveDark" : "text-ink4"}`}
                >
                  {i.deltaPct >= 0 ? "+" : ""}
                  {i.deltaPct}%
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
