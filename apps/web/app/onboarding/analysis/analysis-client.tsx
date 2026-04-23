"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { skipToken } from "@tanstack/react-query";
import { trpc } from "../../../lib/trpc";

type Stage = "thinking" | "done" | "error";

type BrandVoice = {
  voiceTone: string[];
  brandValues: string[];
  audienceSegments: { name: string; description: string }[];
  contentPillars: string[];
  doNotDoList: string[];
};

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
      <div className="flex flex-col items-center gap-md w-full max-w-md">
        <div className="flex items-center gap-md mb-lg">
          <span
            className="inline-block w-sm h-sm rounded-full bg-alive animate-pulse"
            aria-hidden
          />
          <h1 className="text-2xl font-medium tracking-tight">ADFI</h1>
        </div>
        <p className="text-sm text-ink3 font-mono text-center">
          I'm reading about your business and figuring out how you sound.
          <br />
          one second...
        </p>
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div className="flex flex-col items-center gap-md w-full max-w-md">
        <div className="flex items-center gap-md mb-lg">
          <span
            className="inline-block w-sm h-sm rounded-full bg-urgent"
            aria-hidden
          />
          <h1 className="text-2xl font-medium tracking-tight">ADFI</h1>
        </div>
        <p className="text-sm text-urgent font-mono text-center">
          something's off — {errorMessage}
        </p>
        <button
          onClick={handleRetry}
          className="px-md py-sm bg-ink text-bg rounded-md font-medium mt-md"
        >
          try again
        </button>
      </div>
    );
  }

  if (!brandVoice) return null;

  return (
    <div className="flex flex-col gap-lg w-full max-w-md">
      <div className="flex items-center gap-md">
        <span
          className="inline-block w-sm h-sm rounded-full bg-alive"
          aria-hidden
        />
        <h1 className="text-2xl font-medium tracking-tight">ADFI</h1>
      </div>
      <p className="text-sm text-ink3 font-mono">
        here's how I'll represent you:
      </p>

      <section className="flex flex-col gap-sm">
        <p className="text-xs font-mono text-ink3 uppercase tracking-wide">
          voice
        </p>
        <p className="text-md text-ink">{brandVoice.voiceTone.join(" · ")}</p>
      </section>

      <section className="flex flex-col gap-sm">
        <p className="text-xs font-mono text-ink3 uppercase tracking-wide">
          values
        </p>
        <p className="text-md text-ink">
          {brandVoice.brandValues.join(" · ")}
        </p>
      </section>

      <section className="flex flex-col gap-sm">
        <p className="text-xs font-mono text-ink3 uppercase tracking-wide">
          audience
        </p>
        <ul className="flex flex-col gap-xs">
          {brandVoice.audienceSegments.map((segment) => (
            <li key={segment.name}>
              <span className="text-md text-ink font-medium">
                {segment.name}
              </span>
              <span className="text-sm text-ink3"> — {segment.description}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-sm">
        <p className="text-xs font-mono text-ink3 uppercase tracking-wide">
          content pillars
        </p>
        <ul className="flex flex-col gap-xs">
          {brandVoice.contentPillars.map((pillar) => (
            <li key={pillar} className="text-md text-ink">
              · {pillar}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-sm">
        <p className="text-xs font-mono text-ink3 uppercase tracking-wide">
          things I'll avoid
        </p>
        <ul className="flex flex-col gap-xs">
          {brandVoice.doNotDoList.map((item) => (
            <li key={item} className="text-sm text-ink3 font-mono">
              · {item}
            </li>
          ))}
        </ul>
      </section>

      <button
        onClick={() => router.push("/me")}
        className="px-md py-sm bg-ink text-bg rounded-md font-medium mt-lg"
      >
        looks right → continue
      </button>
    </div>
  );
}
