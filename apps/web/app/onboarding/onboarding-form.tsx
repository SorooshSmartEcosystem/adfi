"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../lib/trpc";
import {
  OnboardingShell,
  OnboardingHeading,
} from "../../components/onboarding/onboarding-shell";
import { PrimaryButton } from "../../components/onboarding/primary-button";

const EXAMPLES = [
  { label: "ceramics studio", text: "handmade ceramics studio in toronto" },
  { label: "photographer", text: "freelance photography" },
  { label: "plant shop", text: "plant shop" },
  { label: "yoga instructor", text: "yoga instructor with private classes" },
  { label: "bakery", text: "bakery specializing in sourdough" },
];

export function OnboardingForm({ initialText }: { initialText: string }) {
  const router = useRouter();
  const [text, setText] = useState(initialText);
  const mutation = trpc.onboarding.saveBusinessDescription.useMutation({
    onSuccess: () => router.push("/onboarding/goal"),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({ text });
  }

  const tooShort = text.trim().length < 10;

  return (
    <OnboardingShell step={1}>
      <form onSubmit={handleSubmit} className="flex flex-col">
        <OnboardingHeading
          title="what does your business do?"
          sub="one sentence. two if it's complex. i'll figure out the rest."
        />

        <textarea
          id="description"
          required
          rows={4}
          minLength={10}
          maxLength={500}
          placeholder="e.g. i run a ceramics studio in toronto — i make tableware and teach classes."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="px-md py-sm bg-bg border-hairline border-border rounded-md text-ink focus:outline-none focus:border-ink resize-none mb-md"
          disabled={mutation.isPending}
        />

        <p className="font-mono text-[10px] text-ink4 tracking-[0.15em] mb-md">
          OR PICK AN EXAMPLE
        </p>
        <div className="flex flex-wrap gap-[6px] mb-lg">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => setText(ex.text)}
              className="font-mono text-xs text-ink2 border-hairline border-border rounded-full px-md py-[5px] hover:border-ink hover:text-ink transition-colors"
            >
              {ex.label}
            </button>
          ))}
        </div>

        <PrimaryButton
          type="submit"
          disabled={mutation.isPending || tooShort}
        >
          {mutation.isPending ? "saving..." : "continue →"}
        </PrimaryButton>

        {mutation.error && (
          <p className="text-sm text-urgent font-mono mt-md" role="alert">
            {mutation.error.message}
          </p>
        )}
      </form>
    </OnboardingShell>
  );
}
