import Link from "next/link";
import { createServerClient } from "@orb/auth/server";
import { BreathingOrb } from "../components/breathing-orb";

export default async function Home() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cta = user ? { href: "/me", label: "home →" } : { href: "/signin", label: "sign in →" };

  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center gap-lg px-lg text-center">
        <BreathingOrb size={18} />
        <h1 className="text-4xl font-medium tracking-tight">ADFI</h1>
        <p className="text-lg text-ink2 max-w-md">
          your ai marketing team. hire it — don't supervise it.
        </p>
        <div className="flex items-center gap-md mt-md">
          <Link
            href={cta.href}
            className="px-lg py-sm bg-ink text-bg rounded-md text-md font-medium"
          >
            {cta.label}
          </Link>
          {!user && (
            <a
              href="#how-it-works"
              className="px-lg py-sm text-sm text-ink3 font-mono underline underline-offset-4"
            >
              how it works
            </a>
          )}
        </div>
      </section>

      {/* Thesis */}
      <section className="flex flex-col items-center gap-md px-lg py-3xl hairline-top">
        <p className="text-xs font-mono text-ink3 uppercase tracking-widest">
          the idea
        </p>
        <p className="prose-reading text-lg text-ink text-center">
          most tools ask you to manage your marketing. ADFI doesn't. you tell it
          what you do once — then it writes the posts, answers the texts,
          watches your competitors, catches the missed calls. in your voice, not
          a template's.
        </p>
        <p className="prose-reading text-md text-ink3 text-center">
          you stay a solopreneur. it does the rest.
        </p>
      </section>

      {/* What happens when you hire it */}
      <section
        id="how-it-works"
        className="flex flex-col items-center gap-xl px-lg py-3xl hairline-top"
      >
        <p className="text-xs font-mono text-ink3 uppercase tracking-widest">
          what happens when you hire ADFI
        </p>
        <div className="grid gap-lg md:grid-cols-3 max-w-4xl w-full">
          <Vignette
            label="tuesday, 2pm"
            title="your instagram just posted"
            body="three photos of the new batch. caption you'd recognize. hashtags you'd approve. I queued it monday; you were making things."
          />
          <Vignette
            label="while you're at lunch"
            title="a customer called"
            body="they wanted a commission. I picked up, got their details, booked them in for thursday. you see a green dot on your home screen."
          />
          <Vignette
            label="sunday night"
            title="a competitor shifted"
            body="heath dropped a new glaze line. I noticed. scout already adjusted what we're watching for next week."
          />
        </div>
      </section>

      {/* Six specialists, one voice */}
      <section className="flex flex-col items-center gap-xl px-lg py-3xl hairline-top">
        <div className="flex flex-col items-center gap-sm">
          <p className="text-xs font-mono text-ink3 uppercase tracking-widest">
            underneath
          </p>
          <h2 className="text-2xl font-medium text-center">
            six specialists. one voice.
          </h2>
          <p className="text-sm text-ink3 font-mono mt-sm text-center max-w-md">
            you only see ADFI. underneath, six agents coordinate — so content,
            conversations, and strategy stay coherent.
          </p>
        </div>

        <div className="grid gap-lg md:grid-cols-2 max-w-3xl w-full">
          <AgentRow
            name="strategist"
            role="reads your business, builds the voice fingerprint"
          />
          <AgentRow
            name="echo"
            role="writes the posts, drafts the captions"
          />
          <AgentRow
            name="signal"
            role="answers calls, replies to sms, books appointments"
          />
          <AgentRow
            name="scout"
            role="watches the competitors you choose"
          />
          <AgentRow
            name="pulse"
            role="catches trends, holidays, market moves worth acting on"
          />
          <AgentRow
            name="ads"
            role="plans campaigns (coming)"
            upcoming
          />
        </div>
      </section>

      {/* Closing CTA */}
      <section className="flex flex-col items-center gap-lg px-lg py-3xl hairline-top">
        <BreathingOrb size={12} />
        <p className="text-md text-ink text-center max-w-md">
          you already know how to run your business.
          <br />
          now stop doing the marketing.
        </p>
        <Link
          href={cta.href}
          className="px-lg py-sm bg-ink text-bg rounded-md text-md font-medium mt-md"
        >
          {cta.label}
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-lg py-lg hairline-top mt-auto">
        <div className="flex justify-between items-center text-xs font-mono text-ink4">
          <span>adfi</span>
          <span>
            {user ? (
              <Link
                href="/me"
                className="hover:text-ink3 transition-colors"
              >
                your home
              </Link>
            ) : (
              <Link
                href="/signin"
                className="hover:text-ink3 transition-colors"
              >
                sign in
              </Link>
            )}
          </span>
        </div>
      </footer>
    </main>
  );
}

function Vignette({
  label,
  title,
  body,
}: {
  label: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col gap-sm bg-surface border-hairline border-border rounded-lg p-lg">
      <p className="text-xs font-mono text-ink3">{label}</p>
      <p className="text-md font-medium text-ink">{title}</p>
      <p className="text-sm text-ink3 leading-relaxed">{body}</p>
    </div>
  );
}

function AgentRow({
  name,
  role,
  upcoming = false,
}: {
  name: string;
  role: string;
  upcoming?: boolean;
}) {
  return (
    <div className="flex items-start gap-md py-sm">
      <span
        className={`mt-xs inline-block w-xs h-xs rounded-full ${upcoming ? "bg-ink4" : "bg-alive"}`}
        aria-hidden
      />
      <div className="flex flex-col">
        <span className="text-md font-medium text-ink">{name}</span>
        <span className="text-sm text-ink3">
          {role}
        </span>
      </div>
    </div>
  );
}
