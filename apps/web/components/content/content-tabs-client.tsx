"use client";

// Client-side tab switcher for /content. Old version used Link
// navigation with ?tab= which forced a full server roundtrip + new
// data fetch on every click. This version mounts each tab's panel
// lazily and only fetches when first viewed — switching tabs is now
// instant after the first visit.
//
// Renders both the tab strip AND the panels. Optional `headerSlot`
// prop slots between them so /content can put the GenerateBar there
// (it should always be visible regardless of active tab).

import { useState } from "react";
import { DraftsPanel } from "./drafts-panel";
import { ContentCalendar } from "./content-calendar";
import { PerformancePanel } from "./performance-panel";

export type Tab = "feed" | "calendar" | "performance";

type Props = {
  initialTab: Tab;
  headerSlot?: React.ReactNode;
};

export function ContentTabsClient({ initialTab, headerSlot }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  // Track which tabs have been viewed so we don't unmount + remount
  // the data-fetching panels every time. First view is lazy; after
  // that the panel stays mounted in `display:none` so the data is
  // hot-cached for instant switches.
  const [seen, setSeen] = useState<Record<Tab, boolean>>({
    feed: initialTab === "feed",
    calendar: initialTab === "calendar",
    performance: initialTab === "performance",
  });

  function go(next: Tab) {
    setTab(next);
    if (!seen[next]) setSeen((s) => ({ ...s, [next]: true }));
  }

  return (
    <>
      <div className="flex items-center gap-lg hairline-bottom pb-sm">
        <TabBtn label="feed" active={tab === "feed"} onClick={() => go("feed")} />
        <TabBtn
          label="calendar"
          active={tab === "calendar"}
          onClick={() => go("calendar")}
        />
        <TabBtn
          label="performance"
          active={tab === "performance"}
          onClick={() => go("performance")}
        />
      </div>

      {headerSlot ? <div className="my-md">{headerSlot}</div> : null}

      <div className={tab === "feed" ? "" : "hidden"}>
        {seen.feed ? <DraftsPanel /> : null}
      </div>
      <div className={tab === "calendar" ? "" : "hidden"}>
        {seen.calendar ? <ContentCalendar /> : null}
      </div>
      <div className={tab === "performance" ? "" : "hidden"}>
        {seen.performance ? <PerformancePanel /> : null}
      </div>
    </>
  );
}

function TabBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-sm transition-colors ${
        active ? "text-ink font-medium" : "text-ink3 hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}
