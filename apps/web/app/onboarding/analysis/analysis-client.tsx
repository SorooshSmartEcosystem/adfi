"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { skipToken } from "@tanstack/react-query";
import { trpc } from "../../../lib/trpc";
import {
  OnboardingShell,
  OnboardingHeading,
} from "../../../components/onboarding/onboarding-shell";
import { PrimaryButton } from "../../../components/onboarding/primary-button";

type Stage = "thinking" | "done" | "error";

type BrandVoice = {
  voiceTone: string[];
  brandValues: string[];
  audienceSegments: { name: string; description: string }[];
  contentPillars: string[];
  doNotDoList: string[];
};

const THINKING_STEPS = [
  "reading your business description",
  "learning how you sound",
  "finding your real audience",
  "spotting your biggest opportunity",
];

export function AnalysisClient() {
  const router = useRouter();
  const hasStarted = useRef(false);
  const [stage, setStage] = useState<Stage>("thinking");
  const [brandVoice, setBrandVoice] = useState<BrandVoice | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);

  const runMutation = trpc.onboarding.runAnalysis.useMutation({
    onSuccess: (data) => setJobId(data.jobId),
    onError: (err) => {
      setErrorMessage(err.message);
      setStage("error");
    },
  });

  const resultQuery = trpc.onboarding.getAnalysisResult.useQuery(
    jobId ? { jobId } : skipToken,
    {
      refetchInterval: (query) => {
        const data = query.state.data;
        if (!data || ("pending" in data && data.pending)) return 1500;
        return false;
      },
    },
  );

  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      runMutation.mutate();
    }
  }, [runMutation]);

  useEffect(() => {
    const data = resultQuery.data;
    if (data && !data.pending) {
      setBrandVoice(data.result as BrandVoice);
      setStage("done");
    }
  }, [resultQuery.data]);

  function handleRetry() {
    setErrorMessage("");
    setStage("thinking");
    hasStarted.current = false;
    runMutation.reset();
    setJobId(null);
  }

  if (stage === "thinking") {
    return (
      <OnboardingShell step={3}>
        <OnboardingHeading
          title="give me 30 seconds."
          sub="i'll look at your business and tell you what i see."
        />
        <div className="bg-ink text-white rounded-xl p-lg mb-lg">
          <div className="flex items-center gap-sm mb-md">
            <span className="w-[7px] h-[7px] rounded-full bg-alive animate-pulse-dot" />
            <span className="font-mono text-[10px] tracking-[0.2em] opacity-80">
              ANALYZING
            </span>
          </div>
          <div className="flex flex-col gap-[9px]">
            {THINKING_STEPS.map((step, i) => (
              <div
                key={step}
                className={`text-xs flex gap-md ${i === 0 ? "" : "opacity-50"}`}
              >
                <span className="font-mono opacity-60">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="font-mono text-[10px] text-ink4 text-center">
          hold tight — i'll show you what i found in a moment
        </p>
      </OnboardingShell>
    );
  }

  if (stage === "error") {
    return (
      <OnboardingShell step={3}>
        <OnboardingHeading
          title="something went sideways."
          sub={errorMessage || "couldn't finish the analysis."}
        />
        <PrimaryButton type="button" onClick={handleRetry}>
          try again →
        </PrimaryButton>
      </OnboardingShell>
    );
  }

  if (!brandVoice) return null;

  return (
    <OnboardingShell step={3} wide>
      <OnboardingHeading
        title="here's what i see."
        sub={<em>nice business.</em>}
      />

      <div className="bg-white border-hairline border-border rounded-lg p-md mb-sm">
        <div className="font-mono text-[10px] text-aliveDark tracking-[0.2em] mb-sm">
          ● HOW I'LL REPRESENT YOU
        </div>
        <p className="text-sm leading-relaxed">
          you sound <strong>{brandVoice.voiceTone.join(" · ")}</strong>. values
          i'll keep front-and-centre: {brandVoice.brandValues.join(", ")}.
        </p>
      </div>

      <div className="bg-attentionBg border-hairline border-attentionBorder rounded-lg p-md mb-sm">
        <div className="font-mono text-[10px] text-attentionText tracking-[0.2em] mb-sm">
          ● YOUR REAL AUDIENCE
        </div>
        <ul className="text-sm leading-relaxed flex flex-col gap-xs">
          {brandVoice.audienceSegments.map((segment) => (
            <li key={segment.name}>
              <strong>{segment.name}</strong>
              <span className="text-ink3"> — {segment.description}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white border-hairline border-border rounded-lg p-md mb-lg">
        <div className="font-mono text-[10px] text-ink4 tracking-[0.2em] mb-sm">
          ● WHAT I'LL POST ABOUT
        </div>
        <div className="flex flex-col gap-xs text-sm">
          {brandVoice.contentPillars.map((pillar) => (
            <div key={pillar}>· {pillar}</div>
          ))}
        </div>
      </div>

      <div className="bg-surface rounded-md p-md mb-md text-center">
        <p className="text-sm font-medium mb-[2px]">
          want me to actually do this for you?
        </p>
        <p className="text-xs text-ink3">
          7 days free · i won't charge until i've proven i'm working
        </p>
      </div>

      <PrimaryButton
        type="button"
        onClick={() => router.push("/onboarding/plan")}
      >
        start my free trial →
      </PrimaryButton>
    </OnboardingShell>
  );
}
