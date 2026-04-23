"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../../lib/trpc";

export function PhoneForm({ existingNumber }: { existingNumber: string | null }) {
  const router = useRouter();
  const [provisionedNumber, setProvisionedNumber] = useState<string | null>(
    existingNumber,
  );

  const provision = trpc.onboarding.provisionPhone.useMutation({
    onSuccess: (data) => setProvisionedNumber(data.number),
  });

  if (provisionedNumber) {
    return (
      <div className="flex flex-col items-center gap-lg w-full max-w-md">
        <div className="flex items-center gap-md mb-lg">
          <span
            className="inline-block w-sm h-sm rounded-full bg-alive"
            aria-hidden
          />
          <h1 className="text-2xl font-medium tracking-tight">ADFI</h1>
        </div>

        <p className="text-sm font-mono text-ink3">your number</p>
        <p className="text-2xl font-mono text-ink tracking-wide">
          {formatPhone(provisionedNumber)}
        </p>
        <p className="text-sm text-ink3 font-mono text-center">
          text this number and I'll answer as you, in your voice.
          <br />
          missed calls and SMS get handled automatically.
        </p>

        <button
          onClick={() => router.push("/me")}
          className="px-md py-sm bg-ink text-bg rounded-md font-medium mt-lg"
        >
          continue →
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-lg w-full max-w-md">
      <div className="flex items-center gap-md mb-lg">
        <span
          className="inline-block w-sm h-sm rounded-full bg-alive"
          aria-hidden
        />
        <h1 className="text-2xl font-medium tracking-tight">ADFI</h1>
      </div>

      <p className="text-sm font-mono text-ink3 text-center">
        next, I need my own phone number.
        <br />
        this is where customers reach you — I pick up when you can't.
      </p>

      <button
        onClick={() => provision.mutate()}
        disabled={provision.isPending}
        className="px-md py-sm bg-ink text-bg rounded-md font-medium disabled:opacity-50 mt-lg"
      >
        {provision.isPending ? "finding a number..." : "get me a number"}
      </button>

      {provision.error && (
        <p className="text-sm text-urgent font-mono text-center" role="alert">
          {provision.error.message}
        </p>
      )}
    </div>
  );
}

function formatPhone(raw: string): string {
  // +14165550172 → +1 (416) 555-0172
  const match = raw.match(/^\+(\d{1,2})(\d{3})(\d{3})(\d{4})$/);
  if (!match) return raw;
  const [, country, area, prefix, line] = match;
  return `+${country} (${area}) ${prefix}-${line}`;
}
