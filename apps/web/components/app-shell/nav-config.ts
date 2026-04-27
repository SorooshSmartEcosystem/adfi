export type AppRoute =
  | "dashboard"
  | "inbox"
  | "content"
  | "report"
  | "brandkit"
  | "settings"
  | "specialist-strategist"
  | "specialist-signal"
  | "specialist-echo"
  | "specialist-scout"
  | "specialist-pulse";

export type NavBadges = { inbox?: number; content?: number };

export const NAV_PRIMARY: { id: AppRoute; label: string; href: string; badgeKey?: keyof NavBadges }[] = [
  { id: "dashboard", label: "dashboard", href: "/dashboard" },
  { id: "inbox", label: "inbox", href: "/inbox", badgeKey: "inbox" },
  { id: "content", label: "content", href: "/content", badgeKey: "content" },
  { id: "brandkit", label: "brand kit", href: "/brandkit" },
  { id: "report", label: "weekly report", href: "/report" },
];

export const NAV_AGENTS: { id: AppRoute; label: string; href: string }[] = [
  { id: "specialist-strategist", label: "strategist", href: "/specialist/strategist" },
  { id: "specialist-signal", label: "signal", href: "/specialist/signal" },
  { id: "specialist-echo", label: "echo", href: "/specialist/echo" },
  { id: "specialist-scout", label: "scout", href: "/specialist/scout" },
  { id: "specialist-pulse", label: "pulse", href: "/specialist/pulse" },
];

export const NAV_BOTTOM: { id: AppRoute; label: string; href: string }[] = [
  { id: "settings", label: "settings", href: "/settings" },
];

export const TOPBAR_COPY: Record<AppRoute, { title: string }> = {
  dashboard: { title: "dashboard" },
  inbox: { title: "inbox" },
  content: { title: "content" },
  report: { title: "weekly report" },
  brandkit: { title: "brand kit" },
  settings: { title: "settings" },
  "specialist-strategist": { title: "strategist" },
  "specialist-signal": { title: "signal" },
  "specialist-echo": { title: "echo" },
  "specialist-scout": { title: "scout" },
  "specialist-pulse": { title: "pulse" },
};
