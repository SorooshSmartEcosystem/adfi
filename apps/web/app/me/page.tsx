import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@orb/auth/server";
import { trpcServer } from "../../lib/trpc-server";

const GOAL_LABELS = {
  MORE_CUSTOMERS: "more new customers",
  MORE_REPEAT_BUYERS: "more repeat buyers",
  MORE_VISIBILITY: "more visibility",
} as const;

export default async function MePage() {
  const supabase = await createServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/signin");

  const trpc = await trpcServer();
  const [user, home] = await Promise.all([
    trpc.user.me(),
    trpc.user.getHomeData(),
  ]);

  const needsBusinessDescription = !user.businessDescription;
  const needsGoal = !user.goal;

  return (
    <main className="min-h-screen flex items-center justify-center px-lg py-2xl">
      <div className="flex flex-col items-center gap-lg max-w-md w-full">
        <div className="flex items-center gap-md">
          <span
            className="inline-block w-sm h-sm rounded-full bg-alive"
            aria-hidden
          />
          <h1 className="text-2xl font-medium tracking-tight">ADFI</h1>
        </div>

        <div className="flex flex-col gap-sm text-center">
          <p className="text-lg font-medium">{user.email ?? user.phone}</p>
          {user.businessDescription ? (
            <p className="text-sm text-ink3 font-mono">
              {user.businessDescription}
            </p>
          ) : (
            <Link
              href="/onboarding"
              className="text-sm text-ink font-mono underline"
            >
              tell me about your business →
            </Link>
          )}
          {user.goal ? (
            <p className="text-xs text-ink4 font-mono">
              going for {GOAL_LABELS[user.goal]}
            </p>
          ) : user.businessDescription ? (
            <Link
              href="/onboarding/goal"
              className="text-xs text-ink font-mono underline"
            >
              pick a goal →
            </Link>
          ) : null}
        </div>

        {!needsBusinessDescription && !needsGoal && (
          <div className="w-full flex flex-col gap-md bg-surface border border-border rounded-lg p-lg">
            <p className="text-xs font-mono text-ink3 uppercase tracking-wide">
              this week
            </p>
            <div className="flex justify-between font-mono">
              <div className="flex flex-col">
                <span className="text-2xl text-ink">
                  {home.weeklyStats.postsCount}
                </span>
                <span className="text-xs text-ink3">posts</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl text-ink">
                  {home.weeklyStats.reach.toLocaleString()}
                </span>
                <span className="text-xs text-ink3">reach</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl text-ink">
                  {home.weeklyStats.messagesHandled}
                </span>
                <span className="text-xs text-ink3">messages</span>
              </div>
            </div>

            {home.phoneStatus.active && (
              <div className="pt-md border-t border-border2">
                <p className="text-xs font-mono text-ink3">my number</p>
                <p className="text-md font-mono text-ink">
                  {home.phoneStatus.number}
                </p>
              </div>
            )}

            {home.trialDaysLeft !== null && home.trialDaysLeft > 0 && (
              <p className="text-xs font-mono text-ink4">
                {home.trialDaysLeft} days left on trial
              </p>
            )}

            {home.pendingFinding && (
              <div className="pt-md border-t border-border2">
                <p className="text-xs font-mono text-attentionText uppercase tracking-wide">
                  needs you
                </p>
                <p className="text-sm text-ink mt-xs">
                  {home.pendingFinding.summary}
                </p>
              </div>
            )}
          </div>
        )}

        {!needsBusinessDescription && !needsGoal && (
          <Link
            href="/content"
            className="text-sm text-ink font-mono underline"
          >
            see my content →
          </Link>
        )}

        <form action="/auth/signout" method="post" className="mt-lg">
          <button
            type="submit"
            className="text-sm text-ink3 font-mono underline"
          >
            sign out
          </button>
        </form>
      </div>
    </main>
  );
}
