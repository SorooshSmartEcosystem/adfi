import Link from "next/link";
import { Orb } from "../shared/orb";

export function HireMeCta() {
  return (
    <section className="py-[100px] px-lg">
      <div className="max-w-[1080px] mx-auto">
        <div className="bg-ink text-white rounded-[28px] px-lg py-[80px] text-center relative overflow-hidden">
          <div className="mx-auto mb-[32px] flex justify-center">
            <Orb size="lg" />
          </div>
          <div className="font-mono text-[10px] text-white/50 tracking-[0.2em] mb-md">
            READY WHEN YOU ARE
          </div>
          <h2 className="text-[clamp(30px,5vw,46px)] font-medium tracking-[-0.02em] mb-md">
            hire me.
          </h2>
          <p className="text-base text-white/70 max-w-[520px] mx-auto leading-[1.55] mb-xl">
            start today. i&apos;ll show you what i can do in the first 7 days —
            no charge. if i haven&apos;t proven myself, you cancel in one tap.
            if i have, we work together.
          </p>
          <div className="flex gap-sm justify-center flex-wrap mb-lg">
            <Link
              href="/signup"
              className="bg-white text-ink px-[26px] py-md rounded-full text-base font-medium"
            >
              start my 7 days free
            </Link>
            <a
              href="#pricing"
              className="bg-transparent text-white px-[22px] py-md rounded-full text-base font-medium border-hairline border-white/20 hover:border-white transition-colors"
            >
              see the plans
            </a>
          </div>
          <div className="flex items-center justify-center gap-lg flex-wrap">
            {[
              "NO CARD CHARGED TODAY",
              "CANCEL IN 1 TAP",
              "WORKING IN 60 SECONDS",
            ].map((t) => (
              <span
                key={t}
                className="font-mono text-[10px] text-white/60 tracking-[0.08em]"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
