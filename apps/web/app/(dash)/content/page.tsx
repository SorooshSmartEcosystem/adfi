import { redirect } from "next/navigation";
import { getCurrentUser } from "@orb/auth/server";
import { trpcServer } from "../../../lib/trpc-server";
import { PageHero } from "../../../components/shared/page-hero";
import { GenerateBar } from "../../../components/content/generate-bar";
import { DraftsPanel } from "../../../components/content/drafts-panel";

// Content page — focused around a single primary action (generate a
// post) with the feed of drafts beneath. Older tabs (week / drafts /
// performance) are removed from this surface; week/performance views
// move to /content/week and /content/performance as separate routes
// once we ship those screens. For now /content is the drafts feed —
// what 90% of users come here for.

export default async function ContentPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/signin");

  const trpc = await trpcServer();
  const drafts = await trpc.content.listDrafts({ limit: 30 });

  // Status line counts — replaces the old 6-tab filter bar. One quiet
  // line tells the user where their backlog is at.
  const inFlight = drafts.items.filter(
    (d) => d.status === "DRAFT" || d.status === "AWAITING_REVIEW",
  ).length;
  const awaitingPhotos = drafts.items.filter(
    (d) => d.status === "AWAITING_PHOTOS",
  ).length;
  const approved = drafts.items.filter((d) => d.status === "APPROVED").length;

  return (
    <div className="max-w-[760px] mx-auto flex flex-col gap-xl">
      <PageHero
        title="content"
        sub="tell adfi what to post — echo will draft it in your voice."
      />

      <GenerateBar />

      <div className="font-mono text-[11px] text-ink4 tracking-[0.18em] flex items-center gap-md flex-wrap">
        <span>{inFlight} IN-FLIGHT</span>
        {awaitingPhotos > 0 ? (
          <>
            <span className="text-ink5">·</span>
            <span className="text-attentionText">
              {awaitingPhotos} AWAITING PHOTOS
            </span>
          </>
        ) : null}
        {approved > 0 ? (
          <>
            <span className="text-ink5">·</span>
            <span>{approved} APPROVED</span>
          </>
        ) : null}
      </div>

      {/* Existing DraftsPanel renders the feed for now — we'll swap
          this for the platform-mockup feed once that's built. */}
      <DraftsPanel />
    </div>
  );
}
