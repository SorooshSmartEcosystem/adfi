"use client";
import { trpc } from "../lib/trpc";

// The hero orb — a breathing dot that turns green when ADFI's backend is
// reachable, ink4-gray on first load, urgent-red if unreachable. Layered with
// a subtler halo ring for weight.
export function BreathingOrb({ size = 14 }: { size?: number }) {
  const { data, isLoading, isError } = trpc.system.health.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const color = isLoading
    ? "bg-ink4"
    : isError
      ? "bg-urgent"
      : data?.ok
        ? "bg-alive"
        : "bg-ink4";

  return (
    <span className="relative inline-block" style={{ width: size, height: size }}>
      <span
        className={`absolute inset-0 rounded-full ${color} animate-halo`}
        aria-hidden
      />
      <span
        className={`absolute inset-0 rounded-full ${color} animate-breathe`}
        aria-hidden
      />
      <span className="sr-only">
        {isLoading
          ? "checking"
          : isError
            ? "offline"
            : data?.ok
              ? "alive"
              : "unknown"}
      </span>
    </span>
  );
}
