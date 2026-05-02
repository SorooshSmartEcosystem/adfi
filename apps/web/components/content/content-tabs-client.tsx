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

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DraftsPanel } from "./drafts-panel";
import { ContentCalendar } from "./content-calendar";
import { PerformancePanel } from "./performance-panel";

export type Tab = "feed" | "calendar" | "performance";

function parseTab(value: string | null | undefined): Tab {
  if (value === "calendar" || value === "performance") return value;
  if (value === "week") return "calendar"; // legacy URL back-compat
  return "feed";
}

type Props = {
  initialTab: Tab;
  headerSlot?: React.ReactNode;
};

export function ContentTabsClient({ initialTab, headerSlot }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

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

  // React to URL changes — the calendar's chip Links navigate with
  // ?tab=performance#p-X. Without this effect the tab state ignores
  // the URL and the page just scrolls to a non-existent anchor on
  // whichever tab was already active.
  useEffect(() => {
    const fromUrl = parseTab(searchParams.get("tab"));
    if (fromUrl !== tab) {
      setTab(fromUrl);
      setSeen((s) => ({ ...s, [fromUrl]: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // After we land on a tab via URL, scroll to the hash if present.
  // Browsers don't auto-scroll because the target element renders
  // AFTER the hash navigation completes (panels mount lazily).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash) return;
    // Wait one frame for the panel to render, then scroll.
    const id = hash.slice(1);
    const tryScroll = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        // brief highlight pulse so the user sees which card landed
        el.classList.add("ring-2", "ring-ink", "ring-offset-2");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-ink", "ring-offset-2");
        }, 1600);
      }
    };
    // Try immediately + retry once after panel data fetches.
    requestAnimationFrame(tryScroll);
    const t = setTimeout(tryScroll, 600);
    return () => clearTimeout(t);
  }, [tab]);

  function go(next: Tab) {
    setTab(next);
    if (!seen[next]) setSeen((s) => ({ ...s, [next]: true }));
    // Update URL so the active tab is shareable + back-button-able.
    router.replace(`/content?tab=${next}`, { scroll: false });
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
