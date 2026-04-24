"use client";
import { useState } from "react";
import { SectionHeading } from "./section-heading";

const FAQS = [
  {
    q: "can i trust an ai with my calls and posts?",
    a: "for the first 7 days, i work in shadow mode — i draft everything, but nothing goes out without your text-message approval. that's enough time for you to see how i work. after that, you can switch to autopilot, stay on manual, or anywhere in between. you're always in control.",
  },
  {
    q: "what if i want to take over a call or a dm?",
    a: "tap the live call banner and you're in. i hand off to you immediately. same for dms and sms — one tap and the conversation is yours. i never lock you out.",
  },
  {
    q: 'what\'s this "adfi number" i keep hearing about?',
    a: "during signup i give you a dedicated phone number. forward your business line to it (i'll show you how, it takes 30 seconds), and any call you miss rings me. i answer in your voice and book when i can. you can also put this number directly on your website or google business — new inquiries come straight to me.",
  },
  {
    q: "what platforms do you support?",
    a: "at launch: instagram, linkedin, email, sms, and phone calls. facebook and google business are coming soon. if you have a specific platform you need, tell us — prioritization is user-driven.",
  },
  {
    q: "how does billing work?",
    a: "card on file at signup, but no charge for 7 days. on day 3-7 i'll show you what i've done — caught calls, posts published, competitors analyzed. if you're happy, billing starts. if not, cancel in one tap from settings and you're not charged.",
  },
  {
    q: "what about my data?",
    a: "your call recordings, messages, and customer data are yours. we encrypt them at rest, never sell them, and never use your content to train general models. you can export everything or delete everything, anytime.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="py-[100px] px-lg">
      <div className="max-w-[720px] mx-auto">
        <SectionHeading
          label="honest answers"
          title="What you're probably wondering."
        />
        <div className="flex flex-col">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className="hairline-bottom border-border2">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between py-md text-left hover:bg-surface/60 transition-colors px-sm -mx-sm rounded-md"
                >
                  <span className="text-md font-medium">{f.q}</span>
                  <span
                    className={`text-xl text-ink3 transition-transform ${isOpen ? "rotate-45" : ""}`}
                  >
                    +
                  </span>
                </button>
                {isOpen ? (
                  <div className="pb-md pr-lg">
                    <p className="text-sm text-ink3 leading-[1.6]">{f.a}</p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
