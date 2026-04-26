"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled app error:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-lg">
      <div className="max-w-md w-full text-center flex flex-col items-center gap-md">
        <span
          className="w-[28px] h-[28px] rounded-full mb-sm"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, #4a4a4a 0%, #1a1a1a 60%, #000 100%)",
          }}
        />
        <p className="font-mono text-xs text-attentionText tracking-widest uppercase">
          something broke
        </p>
        <h1 className="text-2xl font-medium tracking-tight">
          i hit a snag rendering this.
        </h1>
        <p className="text-md text-ink3 leading-relaxed">
          this isn&apos;t your fault. the error&apos;s logged on our side. try
          again, or go back to the dashboard.
        </p>
        {error.digest ? (
          <p className="font-mono text-[10px] text-ink5 tracking-widest mt-xs">
            ref · {error.digest}
          </p>
        ) : null}
        <div className="flex items-center gap-md mt-md">
          <button
            type="button"
            onClick={reset}
            className="bg-ink text-white font-mono text-xs px-md py-[7px] rounded-full"
          >
            try again
          </button>
          <a
            href="/dashboard"
            className="font-mono text-xs text-ink2 border-hairline border-border rounded-full px-md py-[6px] hover:border-ink hover:text-ink transition-colors"
          >
            dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
