export type AppRoute =
  | "dashboard"
  | "inbox"
  | "content"
  | "report"
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

export const TOPBAR_COPY: Record<AppRoute, { title: string; sub: string }> = {
  dashboard: { title: "dashboard", sub: "your business, at a glance" },
  inbox: { title: "inbox", sub: "messages and calls" },
  content: { title: "content", sub: "what i'm posting for you" },
  report: { title: "weekly report", sub: "your week in numbers" },
  settings: { title: "settings", sub: "account · billing · integrations" },
  "specialist-strategist": { title: "strategist", sub: "your business strategy" },
  "specialist-signal": { title: "signal", sub: "calls · sms · dms" },
  "specialist-echo": { title: "echo", sub: "content creation" },
  "specialist-scout": { title: "scout", sub: "competitor tracking" },
  "specialist-pulse": { title: "pulse", sub: "market signals" },
};
