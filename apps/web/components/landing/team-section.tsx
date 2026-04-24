import { SectionHeading } from "./section-heading";

const TEAM = [
  {
    name: "strategist",
    role: "studies your business, defines your voice, sets the weekly plan.",
  },
  {
    name: "signal",
    role: "answers calls, replies to sms and dms, books appointments.",
  },
  {
    name: "echo",
    role: "writes your posts, matches your voice, publishes on schedule.",
  },
  {
    name: "scout",
    role: "tracks your competitors. surfaces what's working in your market.",
  },
  {
    name: "pulse",
    role: "watches news and trends that matter to your business.",
  },
  {
    name: "ads",
    role: "runs and optimizes your paid campaigns on meta and google.",
    coming: true,
  },
  {
    name: "site",
    role: "builds and updates your website without you touching a template.",
    coming: true,
  },
];

export function TeamSection() {
  return (
    <section id="team" className="py-[100px] px-lg">
      <div className="max-w-[720px] mx-auto">
        <SectionHeading
          label="meet the team"
          title="There's not one of me. There are six."
          intro="adfi is a team of specialists working under one name. you talk to one interface. behind the scenes, six agents coordinate. you never have to manage them — that's my job."
        />

        <div className="flex flex-col gap-md">
          {TEAM.map((m) => (
            <div key={m.name} className="flex items-start gap-md">
              <span
                className={`mt-[6px] w-[10px] h-[10px] rounded-full shrink-0 ${m.coming ? "bg-border" : "bg-ink animate-pulse-dot"}`}
              />
              <div>
                <div className="text-md font-medium flex items-center gap-sm">
                  {m.name}
                  {m.coming ? (
                    <span className="font-mono text-[9px] text-attentionText bg-attentionBg border-hairline border-attentionBorder rounded-full px-sm py-[1px] tracking-[0.15em]">
                      COMING SOON
                    </span>
                  ) : null}
                </div>
                <div className="text-sm text-ink3">{m.role}</div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm text-ink4 mt-xl max-w-[520px]">
          you don&apos;t need to learn any of their names. you talk to adfi. we
          handle the rest internally.
        </p>
      </div>
    </section>
  );
}
