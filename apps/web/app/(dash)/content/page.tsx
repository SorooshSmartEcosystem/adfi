import { redirect } from "next/navigation";
import { getCurrentUser } from "@orb/auth/server";
import { GenerateBar } from "../../../components/content/generate-bar";
import { ContentTabsClient } from "../../../components/content/content-tabs-client";

// Content page — minimal layout:
//   1. tabs at the very top (feed / calendar / performance)
//   2. GenerateBar (the single primary action)
//   3. tab content
//
// The calendar tab is now month-based and pulls its own data
// client-side; the page no longer pre-builds week slots.

type Tab = "feed" | "calendar" | "performance";

function parseTab(value: string | string[] | undefined): Tab {
  if (value === "calendar" || value === "performance") return value;
  // Back-compat: old links used ?tab=week — route them to calendar.
  if (value === "week") return "calendar";
  return "feed";
}

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/signin");

  const { tab: tabParam } = await searchParams;
  const initialTab = parseTab(tabParam);

  return (
    <div className="max-w-[1100px] mx-auto flex flex-col gap-lg">
      <ContentTabsClient initialTab={initialTab} headerSlot={<GenerateBar />} />
    </div>
  );
}
