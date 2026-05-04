"use client";

// Freeze / unfreeze button for the admin user detail page. Renders
// as a single button whose label flips based on current state. On
// click we run the matching server action which calls the admin
// tRPC mutation, sets/clears deletedAt, and revalidates the page.
//
// "Freeze" stops the user from consuming Anthropic / Replicate /
// Twilio tokens via crons + webhooks (Telegram, Messenger,
// Instagram DM, SMS). It does NOT prevent sign-in. For test
// accounts we use it to keep the daily-content + daily-pulse +
// quarterly-strategist crons from firing on idle accounts.

import { useState, useTransition } from "react";
import { freezeUserAction, unfreezeUserAction } from "./freeze-actions";

export function FreezeButton({
  userId,
  isFrozen,
}: {
  userId: string;
  isFrozen: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      try {
        if (isFrozen) {
          await unfreezeUserAction(userId);
        } else {
          // Default reason — admins can edit history later if needed.
          await freezeUserAction(userId, "frozen via admin dashboard");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-xs">
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        className={`text-xs font-mono px-md py-sm rounded-full border-hairline transition-colors disabled:opacity-40 ${
          isFrozen
            ? "border-alive text-alive hover:bg-alive hover:text-bg"
            : "border-urgent text-urgent hover:bg-urgent hover:text-bg"
        }`}
      >
        {isPending
          ? "one second…"
          : isFrozen
            ? "unfreeze user"
            : "freeze user"}
      </button>
      {error ? (
        <p className="text-[11px] font-mono text-urgent">{error}</p>
      ) : null}
    </div>
  );
}
