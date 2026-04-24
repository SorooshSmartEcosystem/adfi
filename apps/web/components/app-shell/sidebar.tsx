"use client";

import Link from "next/link";
import {
  NAV_AGENTS,
  NAV_BOTTOM,
  NAV_PRIMARY,
  type AppRoute,
  type NavBadges,
} from "./nav-config";

export function Sidebar({
  open,
  activeRoute,
  business,
  user,
  navBadges,
  onNavigate,
}: {
  open: boolean;
  activeRoute: AppRoute;
  business: { name: string; initials: string };
  user: { name: string; planLabel: string };
  navBadges: NavBadges;
  onNavigate: () => void;
}) {
  return (
    <>
      <aside
        className={`fixed top-0 bottom-0 left-0 w-[260px] bg-bg border-r-hairline border-border flex flex-col p-lg z-50 overflow-y-auto transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="flex items-center justify-between px-xs pb-lg hairline-b2 mb-md">
          <div className="flex items-center gap-sm min-w-0 flex-1">
            <div className="w-7 h-7 rounded-md bg-ink text-white flex items-center justify-center font-mono text-xs font-medium shrink-0">
              {business.initials}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="text-sm font-medium truncate">{business.name}</div>
              <div className="flex items-center gap-[5px] font-mono text-[10px] text-aliveDark">
                <span className="w-[5px] h-[5px] rounded-full bg-alive" />
                <span>everything is running</span>
              </div>
            </div>
          </div>
        </div>

        <SidebarSection label="your business">
          {NAV_PRIMARY.map((n) => (
            <SidebarLink
              key={n.id}
              href={n.href}
              label={n.label}
              active={activeRoute === n.id}
              badge={n.badgeKey ? navBadges[n.badgeKey] : undefined}
              onNavigate={onNavigate}
            />
          ))}
        </SidebarSection>

        <SidebarSection label="specialists">
          {NAV_AGENTS.map((n) => (
            <SidebarLink
              key={n.id}
              href={n.href}
              label={n.label}
              active={activeRoute === n.id}
              onNavigate={onNavigate}
            />
          ))}
        </SidebarSection>

        <div className="mt-auto pt-md hairline-top border-border2">
          {NAV_BOTTOM.map((n) => (
            <SidebarLink
              key={n.id}
              href={n.href}
              label={n.label}
              active={activeRoute === n.id}
              onNavigate={onNavigate}
            />
          ))}
          <Link
            href="/settings"
            onClick={onNavigate}
            className="flex items-center gap-sm px-xs py-sm rounded-md hover:bg-surface transition-colors"
          >
            <div className="w-[26px] h-[26px] rounded-full bg-surface flex items-center justify-center text-xs font-medium shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="text-xs font-medium truncate">{user.name}</div>
              <div className="font-mono text-[10px] text-ink4">{user.planLabel}</div>
            </div>
          </Link>
        </div>
      </aside>

      {open && (
        <button
          aria-label="close menu"
          onClick={onNavigate}
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
        />
      )}
    </>
  );
}

function SidebarSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-md">
      <div className="font-mono text-[9px] text-ink5 tracking-[0.2em] uppercase px-xs pb-sm">
        {label}
      </div>
      <div className="flex flex-col gap-[2px]">{children}</div>
    </div>
  );
}

function SidebarLink({
  href,
  label,
  active,
  badge,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  badge?: number;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-sm px-xs py-[9px] rounded-md text-sm transition-colors ${
        active
          ? "bg-ink text-white"
          : "text-ink2 hover:bg-surface"
      }`}
    >
      <span
        className={`w-[6px] h-[6px] rounded-full shrink-0 ${active ? "bg-white/70" : "bg-current opacity-50"}`}
      />
      <span className="flex-1">{label}</span>
      {badge && badge > 0 ? (
        <span
          className={`ml-auto font-mono text-[10px] px-[6px] py-[1px] rounded-full ${
            active
              ? "bg-white/15 text-white"
              : "bg-attentionBg text-attentionText"
          }`}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
