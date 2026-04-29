import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@orb/auth/server";
import { NewBusinessForm } from "./new-business-form";

export const metadata: Metadata = {
  title: "add a new business · adfi",
};

// /onboarding/new-business — guided form for adding a second (or
// later) Business to an existing account. Replaces the inline
// name-only input the sidebar switcher used to show.
//
// Why a dedicated page instead of expanding the sidebar input:
//   - A new Business needs at minimum a name + description for the
//     agents to do anything useful. The name-only shortcut left
//     users with broken kits (Echo couldn't draft, Strategist had
//     nothing to refresh from).
//   - Onboarding is a familiar shape — users already went through
//     it for their first business. Mirroring that shape for adds
//     keeps the mental model consistent.
//
// AgentContext (brand voice) is currently shared across all of a
// user's businesses (see project_multi_business memory). Per-business
// voice is parked work — for now the new Business inherits the user's
// existing voice. If they want a different voice they can edit
// /specialist/strategist later.
export default async function NewBusinessPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/signin");
  return <NewBusinessForm />;
}
