"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../../lib/trpc";
import {
  OnboardingShell,
  OnboardingHeading,
} from "../../../components/onboarding/onboarding-shell";
import { PrimaryButton } from "../../../components/onboarding/primary-button";

function formatPhone(raw: string): string {
  const match = raw.match(/^\+(\d{1,2})(\d{3})(\d{3})(\d{4})$/);
  if (!match) return raw;
  const [, country, area, prefix, line] = match;
  return `+${country} (${area}) ${prefix}-${line}`;
}

export function PhoneForm({ existingNumber }: { existingNumber: string | null }) {
  const router = useRouter();
  const [provisionedNumber, setProvisionedNumber] = useState<string | null>(
    existingNumber,
  );

  const provision = trpc.onboarding.provisionPhone.useMutation({
    onSuccess: (data) => setProvisionedNumber(data.number),
  });

  return (
    <OnboardingShell step={5}>
      <OnboardingHeading
        title="here's your adfi number."
        sub="this is how i catch calls and texts for you."
      />

      {provisionedNumber ? (
        <div className="bg-ink text-white rounded-xl p-lg mb-md text-center">
          <div className="flex items-center justify-center gap-sm mb-sm">
            <span className="w-[7px] h-[7px] rounded-full bg-alive animate-pulse-dot" />
            <span className="font-mono text-[10px] tracking-[0.2em] opacity-70">
              ACTIVE · READY FOR CALLS
            </span>
          </div>
          <p className="font-mono text-xl font-medium tracking-tight mb-xs">
            {formatPhone(provisionedNumber)}
          </p>
          <p className="text-[11px] opacity-50">local · toronto</p>
        </div>
      ) : (
        <div className="bg-ink text-white rounded-xl p-lg mb-md">
          <div className="flex items-center gap-sm mb-sm">
            <span className="w-[7px] h-[7px] rounded-full bg-alive animate-pulse-dot" />
            <span className="font-mono text-[10px] tracking-[0.2em] opacity-70">
              LET ME GRAB A LOCAL NUMBER
            </span>
          </div>
          <p className="text-sm opacity-80 leading-[1.5]">
            i&apos;ll reserve a number in your area so calls and texts can come
            straight to me.
          </p>
        </div>
      )}

      <div className="bg-white border-hairline border-border rounded-md p-md mb-lg">
        <div className="font-mono text-[10px] text-ink4 tracking-[0.2em] mb-md">
          TWO WAYS TO USE IT
        </div>
        <div className="flex flex-col gap-md">
          <div className="flex gap-md items-start">
            <span className="font-mono text-xs text-ink">01</span>
            <div>
              <div className="text-sm font-medium">
                forward your business line to this
              </div>
              <div className="text-xs text-ink3 mt-[2px]">
                when you miss a call, it rings me. i answer in your voice.
              </div>
            </div>
          </div>
          <div className="flex gap-md items-start">
            <span className="font-mono text-xs text-ink">02</span>
            <div>
              <div className="text-sm font-medium">
                put it on your website or google business
              </div>
              <div className="text-xs text-ink3 mt-[2px]">
                new inquiries hit me directly — i qualify, answer, and book.
              </div>
            </div>
          </div>
        </div>
      </div>

      {provisionedNumber ? (
        <PrimaryButton
          type="button"
          onClick={() => router.push("/onboarding/instagram")}
        >
          continue →
        </PrimaryButton>
      ) : (
        <PrimaryButton
          type="button"
          onClick={() => provision.mutate()}
          disabled={provision.isPending}
        >
          {provision.isPending ? "finding a number..." : "get me a number →"}
        </PrimaryButton>
      )}

      <button
        type="button"
        onClick={() => router.push("/onboarding/instagram")}
        className="block mx-auto mt-md font-mono text-[11px] text-ink5"
      >
        i&apos;ll set it up later
      </button>

      {provision.error && (
        <p
          className="text-sm text-urgent font-mono text-center mt-md"
          role="alert"
        >
          {provision.error.message}
        </p>
      )}
    </OnboardingShell>
  );
}
