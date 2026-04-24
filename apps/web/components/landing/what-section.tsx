import { SectionHeading } from "./section-heading";

const ITEMS = [
  {
    label: "SIGNAL",
    title: "I catch your calls.",
    desc: "when a customer calls and you can't pick up, i answer in your voice. book appointments, answer questions, save the lead.",
  },
  {
    label: "ECHO",
    title: "I post for you.",
    desc: "instagram, linkedin, email. i write in your voice, draft in your style, and publish on the rhythm that actually works for your industry.",
  },
  {
    label: "SCOUT",
    title: "I watch your rivals.",
    desc: "every week, i check what your competitors are doing and surface what's worth copying — and what's worth ignoring.",
  },
];

export function WhatSection() {
  return (
    <section id="what" className="py-[100px] px-lg">
      <div className="max-w-[1080px] mx-auto">
        <SectionHeading
          label="what i do"
          title="I run the parts of your business that aren't your craft."
          intro="you didn't start your business to write captions or answer dms. i did. here's what i quietly handle while you work on what matters."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          {ITEMS.map((it) => (
            <div
              key={it.label}
              className="border-hairline border-border rounded-2xl p-lg bg-bg hover:bg-white transition-colors"
            >
              <div className="flex items-center gap-sm mb-md">
                <span className="w-[7px] h-[7px] rounded-full bg-alive animate-pulse-dot" />
                <span className="font-mono text-xs text-ink3 tracking-[0.2em]">
                  {it.label}
                </span>
              </div>
              <div className="text-lg font-medium mb-sm">{it.title}</div>
              <p className="text-sm text-ink3 leading-[1.6]">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
