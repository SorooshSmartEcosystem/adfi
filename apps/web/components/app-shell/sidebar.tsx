"use client";

import Link from "next/link";
import {
  NAV_AGENTS,
  NAV_BOTTOM,
  NAV_PRIMARY,
  type AppRoute,
  type NavBadges,
  type NavIcon,
} from "./nav-config";
import { NavIconGlyph } from "./nav-icons";

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
  business: { name: string; initials: string; logoUrl?: string | null };
  user: { name: string; planLabel: string };
  navBadges: NavBadges;
  onNavigate: () => void;
}) {
  return (
    <>
      <aside
        className={`fixed top-0 bottom-0 left-0 w-[260px] bg-bg border-r-hairline border-border flex flex-col p-lg z-50 overflow-y-auto transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="flex items-center gap-sm pb-lg hairline-b2 mb-md px-xs">
          {business.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.logoUrl}
              alt=""
              className="w-7 h-7 rounded-md object-cover shrink-0 bg-ink"
            />
          ) : (
            <div className="w-7 h-7 rounded-md bg-ink text-white flex items-center justify-center font-mono text-xs font-medium shrink-0">
              {business.initials}
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <div className="text-sm font-medium truncate">{business.name}</div>
            <div className="text-[11px] text-ink4 mt-[1px]">
              {user.planLabel}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-[2px] py-sm">
          {NAV_PRIMARY.map((n) => (
            <SidebarLink
              key={n.id}
              href={n.href}
              label={n.label}
              icon={n.icon}
              active={activeRoute === n.id}
              badge={n.badgeKey ? navBadges[n.badgeKey] : undefined}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        <SidebarSection label="specialists">
          {NAV_AGENTS.map((n) => (
            <SidebarLink
              key={n.id}
              href={n.href}
              label={n.label}
              icon={n.icon}
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
              icon={n.icon}
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
    <div className="py-sm">
      <div className="text-[11px] text-ink4 px-xs pb-xs">{label}</div>
      <div className="flex flex-col gap-[2px]">{children}</div>
    </div>
  );
}

function SidebarLink({
  href,
  label,
  icon,
  active,
  badge,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: NavIcon;
  active: boolean;
  badge?: number;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-sm px-[10px] py-[8px] rounded-md text-[13px] transition-colors ${
        active ? "bg-ink text-white" : "text-ink2 hover:bg-surface"
      }`}
    >
      <NavIconGlyph name={icon} />
      <span className="flex-1">{label}</span>
      {badge && badge > 0 ? (
        <span
          className={`ml-auto font-mono text-[10px] px-[6px] py-[1px] rounded-full ${
            active ? "bg-white/15 text-white" : "bg-attentionBg text-attentionText"
          }`}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
