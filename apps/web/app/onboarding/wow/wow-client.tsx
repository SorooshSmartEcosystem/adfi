"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "../../../lib/trpc";
import { Orb } from "../../../components/shared/orb";

type PreviewResult = {
  voice: { tone: string[]; pillars: string[] };
  post: {
    hook: string;
    body: string;
    cta: string | null;
    hashtags: string[];
    visualDirection: string;
  };
  imageUrl: string | null;
  resumeToken: string;
};

const PREVIEW_CACHE_KEY = "adfi.onboarding.preview";
const PREVIEW_CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

const EXAMPLES: { label: string; text: string }[] = [
  {
    label: "ceramics studio",
    text: "i run a ceramics studio in toronto — handmade tableware and small classes.",
  },
  {
    label: "photographer",
    text: "freelance brand photographer — i shoot lookbooks for indie fashion labels.",
  },
  {
    label: "yoga instructor",
    text: "i'm a private yoga instructor running small group classes in vancouver.",
  },
  {
    label: "bakery",
    text: "sourdough bakery — wholesale to cafes and a saturday market stall.",
  },
  {
    label: "leather goods",
    text: "i make custom leather goods — wallets, belts, small bags.",
  },
];

export function WowClient() {
  const [stage, setStage] = useState<"input" | "build" | "ask">("input");
  const [text, setText] = useState("");
  const [result, setResult] = useState<PreviewResult | null>(null);

  const preview = trpc.onboarding.previewDemo.useMutation({
    onSuccess: (data) => {
      setResult(data);
      // Persist so a refresh doesn't lose the result. Resume page is the
      // canonical recovery path; localStorage is just continuity within the
      // same browser session.
      try {
        localStorage.setItem(
          PREVIEW_CACHE_KEY,
          JSON.stringify({ at: Date.now(), text, result: data }),
        );
      } catch {
        /* storage unavailable — fine */
      }
    },
  });

  // Restore an in-progress result on mount if one is still fresh.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREVIEW_CACHE_KEY);
      if (!raw) return;
      const cached = JSON.parse(raw) as {
        at: number;
        text: string;
        result: PreviewResult;
      };
      if (Date.now() - cached.at > PREVIEW_CACHE_TTL_MS) {
        localStorage.removeItem(PREVIEW_CACHE_KEY);
        return;
      }
      if (cached.result?.resumeToken) {
        setText(cached.text);
        setResult(cached.result);
        setStage("ask");
      }
    } catch {
      /* parse failed — ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleStart() {
    if (text.trim().length < 10) return;
    setStage("build");
    preview.mutate({ businessDescription: text.trim() });
  }

  function handleReplay() {
    setStage("input");
    setResult(null);
    preview.reset();
    try {
      localStorage.removeItem(PREVIEW_CACHE_KEY);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header />

      <div className="flex-1 max-w-[1080px] w-full mx-auto px-[32px] pt-[80px] pb-[120px] sm:px-[20px] sm:pt-[48px] sm:pb-[80px]">
        {stage === "input" ? (
          <InputScreen
            text={text}
            setText={setText}
            onStart={handleStart}
            error={preview.error?.message}
          />
        ) : null}

        {stage === "build" ? (
          <BuildScreen
            businessText={text}
            result={result}
            error={preview.error?.message}
            onContinue={() => setStage("ask")}
            onRetry={handleReplay}
          />
        ) : null}

        {stage === "ask" && result ? (
          <AskScreen result={result} onReplay={handleReplay} />
        ) : null}
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="px-[32px] py-[24px] flex items-center border-b-hairline border-border sm:px-[20px] sm:py-[18px]">
      <Link href="/" className="flex items-center gap-md">
        <Orb size="sm" animated={false} ring={false} />
        <span className="text-sm font-medium">adfi</span>
      </Link>
      <div className="ml-auto inline-flex items-center gap-sm text-xs text-ink4 sm:hidden">
        <span className="w-[6px] h-[6px] rounded-full bg-alive animate-pulse" />
        no signup yet — just show me
      </div>
    </header>
  );
}

function InputScreen({
  text,
  setText,
  onStart,
  error,
}: {
  text: string;
  setText: (v: string) => void;
  onStart: () => void;
  error?: string;
}) {
  const ready = text.trim().length >= 10;
  return (
    <section className="max-w-[640px] animate-[fade-up_0.5s_ease]">
      <h1
        className="font-medium tracking-tight leading-[1.05] mb-[14px]"
        style={{ fontSize: "clamp(32px, 5vw, 48px)", letterSpacing: "-0.025em" }}
      >
        tell me what you do.
      </h1>
      <p className="text-md text-ink3 leading-[1.5] mb-[36px]">
        one sentence is enough. i&apos;ll show you what i&apos;d post on monday.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder="e.g. i run a ceramics studio in toronto — handmade tableware and small classes."
        className="w-full px-lg py-[18px] bg-white border-hairline border-border rounded-[14px] text-base text-ink leading-[1.5] resize-none focus:outline-none focus:border-ink mb-[14px]"
      />

      <div className="flex flex-wrap gap-[6px] mb-[36px]">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            type="button"
            onClick={() => setText(ex.text)}
            className="px-md py-[6px] rounded-full border-hairline border-border bg-white text-xs text-ink3 hover:border-ink hover:text-ink transition-colors"
          >
            {ex.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onStart}
        disabled={!ready}
        className="inline-flex items-center gap-sm px-xl py-md bg-ink text-white rounded-full text-sm font-medium hover:opacity-85 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        show me what you&apos;d do
        <span aria-hidden>→</span>
      </button>

      {error ? (
        <p className="text-xs text-urgent mt-md">{error}</p>
      ) : null}

      <div className="text-xs text-ink4 mt-[24px]">
        no email needed yet. you&apos;ll see the result first.
      </div>
    </section>
  );
}

const STEP_LABELS = [
  "i'm reading your business",
  "i'm writing your brand voice",
  "i'm drafting monday's post",
  "i'm designing the cover photo",
] as const;

function BuildScreen({
  businessText,
  result,
  error,
  onContinue,
  onRetry,
}: {
  businessText: string;
  result: PreviewResult | null;
  error?: string;
  onContinue: () => void;
  onRetry: () => void;
}) {
  // Steps tick over on a fixed schedule for the first three; the 4th waits
  // for `result` to land (image is the slowest call). When result arrives,
  // we mark step 4 done and trigger the transition.
  const [activeIdx, setActiveIdx] = useState(0);
  const continued = useRef(false);

  useEffect(() => {
    const t1 = setTimeout(() => setActiveIdx(1), 1200);
    const t2 = setTimeout(() => setActiveIdx(2), 3000);
    const t3 = setTimeout(() => setActiveIdx(3), 5500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  useEffect(() => {
    if (result && !continued.current) {
      // Wait until after step 4 has had a moment to render before flipping.
      continued.current = true;
      const t = setTimeout(() => {
        setActiveIdx(4);
        const t2 = setTimeout(onContinue, 800);
        // best-effort cleanup
        return () => clearTimeout(t2);
      }, Math.max(0, 6800 - Date.now() % 1000));
      return () => clearTimeout(t);
    }
  }, [result, onContinue]);

  if (error) {
    return (
      <section className="max-w-[640px] animate-[fade-up_0.5s_ease]">
        <h2 className="text-2xl font-medium mb-md">i hit a snag.</h2>
        <p className="text-md text-ink3 mb-lg">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-sm px-lg py-md bg-ink text-white rounded-full text-sm"
        >
          try again
        </button>
      </section>
    );
  }

  return (
    <section className="max-w-[640px] animate-[fade-up_0.5s_ease]">
      <div className="inline-flex items-center gap-sm text-aliveDark text-xs mb-[28px]">
        <span className="w-[7px] h-[7px] rounded-full bg-alive animate-pulse" />
        {STEP_LABELS[Math.min(activeIdx, STEP_LABELS.length - 1)]}…
      </div>

      <h2
        className="font-medium tracking-tight leading-[1.1] mb-[40px]"
        style={{ fontSize: "clamp(28px, 4vw, 36px)", letterSpacing: "-0.025em" }}
      >
        {activeIdx >= 4 ? "here's monday." : "building monday's post."}
      </h2>

      <Step idx={0} activeIdx={activeIdx} label="i read your business">
        <p className="text-xs text-ink3 leading-[1.5] mt-xs">
          “{businessText.slice(0, 140)}
          {businessText.length > 140 ? "…" : ""}”
        </p>
      </Step>

      <Step idx={1} activeIdx={activeIdx} label="i wrote your brand voice">
        {result ? (
          <div className="flex flex-wrap gap-[6px] mt-sm">
            {result.voice.tone.map((t, i) => (
              <span
                key={t}
                className="px-md py-[5px] bg-white border-hairline border-border rounded-full text-xs text-ink2 animate-[fade-up_0.5s_ease_forwards]"
                style={{ animationDelay: `${i * 0.12}s`, opacity: 0 }}
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </Step>

      <Step idx={2} activeIdx={activeIdx} label="i drafted monday's post">
        {result ? (
          <p className="text-xs text-ink3 leading-[1.5] italic mt-xs">
            “{result.post.hook}”
          </p>
        ) : null}
      </Step>

      <Step idx={3} activeIdx={activeIdx} label="i designed the cover photo" />
    </section>
  );
}

function Step({
  idx,
  activeIdx,
  label,
  children,
}: {
  idx: number;
  activeIdx: number;
  label: string;
  children?: React.ReactNode;
}) {
  const state =
    activeIdx > idx ? "done" : activeIdx === idx ? "active" : "pending";
  return (
    <div
      className={`flex items-start gap-md mb-[28px] transition-all duration-500 ${state === "pending" ? "opacity-45" : "opacity-100"}`}
      style={{ transform: state === "pending" ? "translateY(4px)" : "none" }}
    >
      <span
        className={`w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 mt-[2px] ${
          state === "done"
            ? "bg-alive text-white"
            : state === "active"
              ? "bg-white border border-alive relative"
              : "bg-transparent border border-border"
        }`}
      >
        {state === "done" ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M3 7L6 10L11 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : state === "active" ? (
          <span className="absolute inset-[4px] rounded-full bg-alive animate-pulse" />
        ) : null}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {children}
      </div>
    </div>
  );
}

function AskScreen({
  result,
  onReplay,
}: {
  result: PreviewResult;
  onReplay: () => void;
}) {
  const router = useRouter();
  const [saveOpen, setSaveOpen] = useState(false);
  const [email, setEmail] = useState("");
  const save = trpc.onboarding.savePreview.useMutation();

  function handleSave() {
    save.mutate({ resumeToken: result.resumeToken, email: email.trim() });
  }

  return (
    <section className="animate-[fade-up_0.5s_ease]">
      <div className="grid grid-cols-1 gap-[32px] lg:grid-cols-[minmax(360px,480px)_1fr] lg:gap-[56px] items-start">
        <div>
          <PostPreview result={result} />
        </div>

        <div className="min-w-0">
          <h2
            className="font-medium tracking-tight leading-[1.1] mb-[14px]"
            style={{ fontSize: "clamp(28px, 4vw, 36px)", letterSpacing: "-0.025em" }}
          >
            this is monday.
          </h2>
          <p className="text-md text-ink3 leading-[1.6] mb-[20px]">
            i&apos;ll do this every weekday — plus answer your dms, catch your
            missed calls, and watch what works.
          </p>
          <div className="bg-surface2 rounded-[12px] p-md text-xs text-ink2 leading-[1.6] mb-[32px]">
            <strong className="font-medium text-ink">tuesday</strong> — a
            behind-the-scenes from {result.voice.pillars[0] ?? "your work"}.
            <br />
            <strong className="font-medium text-ink">wednesday</strong> — a
            customer story.
            <br />
            <strong className="font-medium text-ink">thursday</strong> —
            newsletter with last week&apos;s drop.
          </div>
          <div className="flex flex-wrap gap-md items-center sm:flex-col sm:items-stretch">
            <button
              type="button"
              onClick={() => router.push("/signup")}
              className="inline-flex items-center justify-center gap-sm px-xl py-md bg-ink text-white rounded-full text-sm font-medium whitespace-nowrap hover:opacity-85 transition-opacity"
            >
              start free 14-day trial
            </button>
            <button
              type="button"
              onClick={() => setSaveOpen((v) => !v)}
              className="inline-flex items-center justify-center gap-sm px-lg py-[13px] border-hairline border-border bg-white rounded-full text-xs text-ink2 whitespace-nowrap hover:border-ink hover:text-ink transition-colors"
            >
              save this for later
            </button>
            <button
              type="button"
              onClick={onReplay}
              className="text-xs text-ink4 hover:text-ink underline"
            >
              try again
            </button>
          </div>

          {saveOpen ? (
            <div className="mt-md p-md bg-white border-hairline border-border rounded-[12px]">
              {save.data ? (
                <div className="text-xs text-ink2 leading-[1.6]">
                  <div className="text-aliveDark font-medium mb-xs">
                    saved.
                  </div>
                  bookmark this link or come back here from the email — your
                  post will be waiting.
                  <a
                    href={save.data.resumeUrl}
                    className="block mt-sm text-ink underline break-all"
                  >
                    {save.data.resumeUrl}
                  </a>
                </div>
              ) : (
                <>
                  <label className="text-xs text-ink3 mb-sm block">
                    where should i send the link?
                  </label>
                  <div className="flex gap-sm flex-wrap">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@yourbusiness.com"
                      className="flex-1 min-w-[200px] px-md py-sm bg-bg border-hairline border-border rounded-md text-sm focus:outline-none focus:border-ink"
                    />
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={
                        save.isPending ||
                        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
                      }
                      className="px-md py-sm bg-ink text-white rounded-md text-xs font-medium disabled:opacity-40"
                    >
                      {save.isPending ? "saving..." : "save"}
                    </button>
                  </div>
                  {save.error ? (
                    <p className="text-xs text-urgent mt-sm">
                      {save.error.message}
                    </p>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          <div className="text-xs text-ink4 mt-md">
            no card required. cancel anytime.
          </div>
        </div>
      </div>
    </section>
  );
}

function PostPreview({ result }: { result: PreviewResult }) {
  return (
    <div className="bg-white border-hairline border-border rounded-[16px] overflow-hidden max-w-full">
      <div className="flex items-center gap-md px-lg py-md border-b-hairline border-border2">
        <div className="w-7 h-7 rounded-full bg-surface flex items-center justify-center text-xs font-medium shrink-0">
          ◐
        </div>
        <div className="text-xs font-medium">your business</div>
        <div className="ml-auto text-[11px] text-ink4">instagram</div>
      </div>
      {result.imageUrl ? (
        <img
          src={result.imageUrl}
          alt=""
          className="w-full aspect-[4/5] object-cover bg-surface"
        />
      ) : (
        <div
          className="w-full aspect-[4/5]"
          style={{
            background:
              "linear-gradient(135deg, #d4a574 0%, #b07c4f 50%, #8a5a35 100%)",
          }}
        />
      )}
      <div className="px-lg pt-md pb-lg">
        <div className="text-sm font-medium leading-[1.4] mb-sm">
          {result.post.hook}
        </div>
        <div className="text-xs text-ink2 leading-[1.55] whitespace-pre-wrap mb-md">
          {result.post.body}
        </div>
        {result.post.cta ? (
          <div className="text-xs text-ink leading-[1.4] mb-sm font-medium">
            {result.post.cta}
          </div>
        ) : null}
        <div className="text-xs text-ink4">
          {result.post.hashtags.slice(0, 6).join(" ")}
        </div>
      </div>
    </div>
  );
}
