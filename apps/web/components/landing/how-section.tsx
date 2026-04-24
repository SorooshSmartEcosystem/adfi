import { SectionHeading } from "./section-heading";

const STEPS = [
  {
    num: "01",
    title: "tell me about your business.",
    desc: "in one sentence. two if it's complex. i'll fill in the rest from your instagram, website, and what i already know about your industry.",
  },
  {
    num: "02",
    title: "pick what you want more of.",
    desc: "more customers? more repeat buyers? more visibility? your answer shapes what i prioritize each week.",
  },
  {
    num: "03",
    title: "i start working.",
    desc: "within minutes i've analyzed your business, picked your rivals to track, and drafted your first week of posts. you approve the first few. then i go on autopilot.",
  },
];

export function HowSection() {
  return (
    <section id="how" className="py-[100px] px-lg">
      <div className="max-w-[1080px] mx-auto">
        <SectionHeading
          label="how it works"
          title="Three steps. Then I start working."
          intro="no calls with account managers, no onboarding checklists. tell me about your business and i'll be running inside of an hour."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
          {STEPS.map((s) => (
            <div key={s.num}>
              <div className="font-mono text-sm text-ink4 tracking-[0.15em] mb-sm">
                {s.num}
              </div>
              <div className="text-lg font-medium mb-sm">{s.title}</div>
              <p className="text-sm text-ink3 leading-[1.6]">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
