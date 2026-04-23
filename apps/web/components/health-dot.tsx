"use client";
import { trpc } from "../lib/trpc";

export function HealthDot() {
  const { data, isLoading, isError } = trpc.system.health.useQuery();
  const state = isLoading ? "pending" : isError ? "error" : data?.ok ? "ok" : "error";

  const color =
    state === "ok" ? "bg-alive" : state === "error" ? "bg-urgent" : "bg-ink4";

  return (
    <span
      className={`inline-block w-sm h-sm rounded-full ${color}`}
      aria-label={
        state === "ok" ? "alive" : state === "error" ? "offline" : "checking"
      }
    />
  );
}
