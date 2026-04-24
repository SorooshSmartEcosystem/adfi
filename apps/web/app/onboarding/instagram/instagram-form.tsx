"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../../lib/trpc";
import {
  OnboardingShell,
  OnboardingHeading,
} from "../../../components/onboarding/onboarding-shell";
import { PrimaryButton } from "../../../components/onboarding/primary-button";

export function InstagramForm() {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const completeMutation = trpc.onboarding.complete.useMutation({
    onSuccess: () => router.push("/dashboard"),
    onError: () => router.push("/dashboard"),
  });

  function handleConnect() {
    // Real Meta OAuth lands later — for now flip the card to "connected" state.
    setConnected(true);
  }

  function handleFinish() {
    setFinishing(true);
    completeMutation.mutate();
  }

  return (
    <OnboardingShell step={6}>
      <OnboardingHeading
        title="one last thing — instagram."
        sub="connect it so i can post for you too. totally optional — you can do this later."
      />

      <button
        type="button"
        onClick={handleConnect}
        className={`w-full text-left bg-white rounded-lg p-md mb-md transition-colors ${
          connected
            ? "border-hairline border-alive"
            : "border-hairline border-border hover:border-ink"
        }`}
      >
        <div className="flex items-center gap-md">
          <div className="w-[36px] h-[36px] rounded-md bg-surface flex items-center justify-center">
            <div className="w-[16px] h-[16px] rounded-[5px] border-[2px] border-ink" />
          </div>
          <div className="flex-1">
            <div className="text-base font-medium">Instagram</div>
            <div
              className={`font-mono text-[10px] mt-[2px] ${connected ? "text-aliveDark" : "text-ink4"}`}
            >
              {connected ? "✓ connected" : "tap to connect"}
            </div>
          </div>
          {connected ? (
            <span className="w-[7px] h-[7px] rounded-full bg-alive animate-pulse-dot" />
          ) : (
            <span className="font-mono text-sm">→</span>
          )}
        </div>
      </button>

      <div className="bg-surface rounded-md p-md mb-lg">
        <p className="text-[11px] text-ink3 leading-[1.55]">
          we never see your password. more platforms later — for now, one is
          enough.
        </p>
      </div>

      <PrimaryButton type="button" onClick={handleFinish} disabled={finishing}>
        {finishing
          ? "starting..."
          : connected
            ? "start working →"
            : "skip & start working →"}
      </PrimaryButton>
    </OnboardingShell>
  );
}
