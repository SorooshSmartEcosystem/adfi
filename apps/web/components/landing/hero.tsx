import Link from "next/link";

export function Hero() {
  return (
    <section className="text-center pt-[100px] pb-[80px] px-lg">
      <div className="max-w-[720px] mx-auto">
        <div className="inline-flex items-center gap-sm bg-white border-hairline border-border rounded-full px-md py-[6px] mb-[28px] font-mono text-[10px] text-ink3 tracking-[0.12em]">
          <span className="w-[6px] h-[6px] rounded-full bg-alive animate-pulse-dot" />
          <span>LIVE · RUNNING FOR SOLOPRENEURS NOW</span>
        </div>

        <div className="relative w-[120px] h-[120px] mx-auto mb-[40px]">
          <div
            className="w-full h-full rounded-full animate-orb-float"
            style={{
              background:
                "radial-gradient(circle at 35% 30%, #2a2a2a 0%, #111 60%)",
            }}
          />
          <div className="absolute -inset-[12px] rounded-full border-hairline border-ink/10 animate-orb-ring" />
        </div>

        <h1 className="text-[clamp(36px,7vw,56px)] font-medium tracking-[-0.035em] leading-[1.05] mb-md">
          Your marketing team, hired.
        </h1>
        <p className="text-[clamp(15px,2.2vw,18px)] text-ink3 max-w-[520px] mx-auto mb-[36px] leading-[1.55]">
          adfi is a team of ai agents that run your marketing end to end. calls,
          posts, messages, competitor watch. you focus on your craft. we handle
          the rest.
        </p>

        <div className="flex gap-sm justify-center flex-wrap mb-md">
          <Link
            href="/signup"
            className="bg-ink text-white px-[26px] py-md rounded-full text-base font-medium"
          >
            start 7 days free
          </Link>
          <a
            href="#how"
            className="bg-transparent text-ink px-[22px] py-md rounded-full text-base font-medium border-hairline border-border hover:border-ink transition-colors"
          >
            see how it works
          </a>
        </div>

        <div className="flex justify-center items-center gap-lg mt-lg flex-wrap">
          {["7 DAYS FREE", "NO CHARGE TODAY", "CANCEL ANYTIME"].map((t) => (
            <span
              key={t}
              className="flex items-center gap-xs font-mono text-[10px] text-ink4 tracking-[0.08em]"
            >
              <span className="w-[4px] h-[4px] rounded-full bg-ink/40" />
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
