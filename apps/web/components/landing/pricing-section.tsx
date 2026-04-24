import Link from "next/link";
import { SectionHeading } from "./section-heading";

const PLANS = [
  {
    id: "starter",
    name: "starter",
    price: 39,
    tagline: "THE ESSENTIALS",
    features: [
      "i answer your calls and texts",
      "i give you business insights each week",
      "no content, no ads — yet",
    ],
  },
  {
    id: "team",
    name: "team",
    price: 99,
    tagline: "MOST SOLOPRENEURS PICK THIS",
    featured: true,
    features: [
      "everything in starter",
      "i post to instagram and linkedin",
      "i watch your competitors",
      "i run your weekly business review",
    ],
  },
  {
    id: "studio",
    name: "studio",
    price: 299,
    tagline: "A FULL MARKETING TEAM",
    features: [
      "everything in team",
      "i run your paid ad campaigns",
      "i build and update your website",
      "unlimited everything",
    ],
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-[100px] px-lg">
      <div className="max-w-[1080px] mx-auto">
        <SectionHeading
          label="pricing"
          title="Pay when it's working."
          intro="7 days free. no charge until i've shown real results. cancel any time from the app."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
          {PLANS.map((p) => (
            <div
              key={p.id}
              className={`relative bg-white rounded-2xl p-lg border-hairline ${
                p.featured
                  ? "border-[1.5px] border-ink md:-translate-y-[8px]"
                  : "border-border"
              }`}
            >
              {p.featured ? (
                <div className="absolute -top-[10px] left-lg bg-ink text-white px-md py-[3px] rounded-full font-mono text-[9px] tracking-[0.15em]">
                  MOST POPULAR
                </div>
              ) : null}
              <div className="flex items-baseline justify-between mb-xs">
                <span className="text-md font-medium">{p.name}</span>
                <span className="text-md">
                  <span className="font-medium">${p.price}</span>
                  <span className="text-xs text-ink4">/mo</span>
                </span>
              </div>
              <div className="font-mono text-[10px] text-ink4 tracking-[0.15em] mb-md">
                {p.tagline}
              </div>
              <ul className="flex flex-col gap-sm mb-lg">
                {p.features.map((f) => (
                  <li
                    key={f}
                    className="text-sm text-ink2 flex items-start gap-sm"
                  >
                    <span className="mt-[7px] w-[4px] h-[4px] rounded-full bg-ink/50 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signin"
                className={`block text-center w-full py-[10px] rounded-full text-sm font-medium transition-colors ${
                  p.featured
                    ? "bg-ink text-white"
                    : "bg-surface text-ink hover:bg-border"
                }`}
              >
                start 7 days free
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center font-mono text-xs text-ink4 mt-lg">
          🔒 stripe · you can change plans any time
        </p>
      </div>
    </section>
  );
}
