"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../../lib/trpc";
import {
  OnboardingShell,
  OnboardingHeading,
} from "../../../components/onboarding/onboarding-shell";
import { PrimaryButton } from "../../../components/onboarding/primary-button";

export function NewBusinessForm() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");

  const create = trpc.business.create.useMutation({
    onSuccess: () => {
      // The mutation already switched the active business server-side.
      // Nuke every cached query so the dashboard renders the new
      // business instead of the previous one's stale data.
      utils.invalidate();
      router.push("/dashboard");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 1) return;
    create.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      websiteUrl: website.trim() ? normalizeUrl(website.trim()) : undefined,
    });
  }

  return (
    <OnboardingShell step={1}>
      <form onSubmit={handleSubmit} className="flex flex-col">
        <OnboardingHeading
          title="add a new business"
          sub="i'll spin up a fresh workspace for it. you can fine-tune everything afterwards from the dashboard."
        />

        <div className="flex flex-col gap-lg mt-xl">
          <div className="flex flex-col gap-xs">
            <label className="text-xs text-ink4 font-mono tracking-wider">
              BUSINESS NAME
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. rosa pottery"
              autoFocus
              className="px-md py-md bg-bg border-hairline border-border rounded-md text-md focus:outline-none focus:border-ink"
              required
            />
          </div>

          <div className="flex flex-col gap-xs">
            <label className="text-xs text-ink4 font-mono tracking-wider">
              WHAT DOES IT DO?
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="one sentence. two if it's complex. i'll figure out the rest."
              rows={3}
              className="px-md py-md bg-bg border-hairline border-border rounded-md text-md focus:outline-none focus:border-ink resize-none"
            />
            <span className="text-[11px] text-ink4">
              optional but recommended — without this the agents have less context
              to work from.
            </span>
          </div>

          <div className="flex flex-col gap-xs">
            <label className="text-xs text-ink4 font-mono tracking-wider">
              WEBSITE (OPTIONAL)
            </label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="rosapottery.com"
              className="px-md py-md bg-bg border-hairline border-border rounded-md text-md focus:outline-none focus:border-ink"
            />
          </div>
        </div>

        {create.error ? (
          <p className="text-sm text-urgent mt-md">{create.error.message}</p>
        ) : null}

        <div className="mt-2xl flex items-center gap-md">
          <PrimaryButton
            type="submit"
            disabled={name.trim().length < 1 || create.isPending}
          >
            {create.isPending ? "creating…" : "create business →"}
          </PrimaryButton>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-ink3 hover:text-ink"
          >
            cancel
          </button>
        </div>
      </form>
    </OnboardingShell>
  );
}

function normalizeUrl(raw: string): string {
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}
