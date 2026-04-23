"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../lib/trpc";

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

  const remaining = 500 - text.length;
  const tooShort = text.length < 10;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-md w-full max-w-md"
    >
      <div className="flex items-center gap-md mb-lg">
        <span
          className="inline-block w-sm h-sm rounded-full bg-alive"
          aria-hidden
        />
        <h1 className="text-2xl font-medium tracking-tight">ADFI</h1>
      </div>

      <label htmlFor="description" className="text-sm font-mono text-ink3">
        tell me about your business
      </label>
      <textarea
        id="description"
        required
        rows={5}
        minLength={10}
        maxLength={500}
        placeholder="I run a small-batch ceramics studio in Toronto. Mostly functional pottery — mugs, bowls, vases."
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="px-md py-sm bg-surface border border-border rounded-md text-ink focus:outline-none focus:border-ink3 resize-none"
        disabled={mutation.isPending}
      />

      <div className="flex items-center justify-between">
        <p className="text-xs text-ink4 font-mono">
          {tooShort ? "at least 10 characters" : `${remaining} left`}
        </p>
      </div>

      <button
        type="submit"
        disabled={mutation.isPending || tooShort}
        className="px-md py-sm bg-ink text-bg rounded-md font-medium disabled:opacity-50"
      >
        {mutation.isPending ? "saving..." : "continue →"}
      </button>

      {mutation.error && (
        <p className="text-sm text-urgent font-mono" role="alert">
          {mutation.error.message}
        </p>
      )}
    </form>
  );
}
