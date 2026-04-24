"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { TOPBAR_COPY, type AppRoute, type NavBadges } from "./nav-config";

function routeFromPath(pathname: string | null): AppRoute {
  if (!pathname) return "dashboard";
  if (pathname.startsWith("/inbox")) return "inbox";
  if (pathname.startsWith("/content")) return "content";
  if (pathname.startsWith("/report")) return "report";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/specialist/strategist")) return "specialist-strategist";
  if (pathname.startsWith("/specialist/signal")) return "specialist-signal";
  if (pathname.startsWith("/specialist/echo")) return "specialist-echo";
  if (pathname.startsWith("/specialist/scout")) return "specialist-scout";
  if (pathname.startsWith("/specialist/pulse")) return "specialist-pulse";
  return "dashboard";
}

export function AppShell({
  business,
  user,
  navBadges,
  children,
}: {
  business: { name: string; initials: string };
  user: { name: string; planLabel: string };
  navBadges: NavBadges;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const activeRoute = routeFromPath(pathname);
  const copy = TOPBAR_COPY[activeRoute];

  return (
    <div className="min-h-screen flex bg-bg">
      <Sidebar
        open={sidebarOpen}
        activeRoute={activeRoute}
        business={business}
        user={user}
        navBadges={navBadges}
        onNavigate={() => setSidebarOpen(false)}
      />
      <main className="flex-1 min-w-0 flex flex-col min-h-screen lg:ml-[260px]">
        <Topbar
          title={copy.title}
          sub={copy.sub}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />
        <div className="flex-1 w-full max-w-[1200px] mx-auto px-xl pt-[28px] pb-[80px]">
          {children}
        </div>
      </main>
    </div>
  );
}
