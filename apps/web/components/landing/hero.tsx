import Link from "next/link";

export function Hero() {
  return (
    <section className="text-center pt-[100px] pb-[80px] px-lg">
      <div className="max-w-[720px] mx-auto">
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
            href="/signin"
            className="bg-ink text-white px-[26px] py-md rounded-full text-base font-medium"
          >
            start free trial
          </Link>
          <a
            href="#how"
            className="bg-transparent text-ink px-[22px] py-md rounded-full text-base font-medium border-hairline border-border hover:border-ink transition-colors"
          >
            see how it works
          </a>
        </div>

        <p className="font-mono text-xs text-ink4 tracking-[0.05em]">
          7 days free · no charge until it&apos;s working · cancel anytime
        </p>
      </div>
    </section>
  );
}
