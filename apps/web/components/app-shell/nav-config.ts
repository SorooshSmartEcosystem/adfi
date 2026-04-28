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

// Icons live in components/app-shell/nav-icons.tsx — single-stroke line
// glyphs that match the brand's no-decoration aesthetic. The icon name
// here keys into NAV_ICONS in that file.
export type NavIcon =
  | "dashboard"
  | "inbox"
  | "content"
  | "brandkit"
  | "report"
  | "settings"
  | "strategist"
  | "signal"
  | "echo"
  | "scout"
  | "pulse";

export const NAV_PRIMARY: {
  id: AppRoute;
  label: string;
  href: string;
  icon: NavIcon;
  badgeKey?: keyof NavBadges;
}[] = [
  { id: "dashboard", label: "dashboard", href: "/dashboard", icon: "dashboard" },
  { id: "inbox", label: "inbox", href: "/inbox", icon: "inbox", badgeKey: "inbox" },
  { id: "content", label: "content", href: "/content", icon: "content", badgeKey: "content" },
  { id: "brandkit", label: "brand kit", href: "/brandkit", icon: "brandkit" },
  { id: "report", label: "weekly report", href: "/report", icon: "report" },
];

export const NAV_AGENTS: { id: AppRoute; label: string; href: string; icon: NavIcon }[] = [
  { id: "specialist-strategist", label: "strategist", href: "/specialist/strategist", icon: "strategist" },
  { id: "specialist-signal", label: "signal", href: "/specialist/signal", icon: "signal" },
  { id: "specialist-echo", label: "echo", href: "/specialist/echo", icon: "echo" },
  { id: "specialist-scout", label: "scout", href: "/specialist/scout", icon: "scout" },
  { id: "specialist-pulse", label: "pulse", href: "/specialist/pulse", icon: "pulse" },
];

export const NAV_BOTTOM: { id: AppRoute; label: string; href: string; icon: NavIcon }[] = [
  { id: "settings", label: "settings", href: "/settings", icon: "settings" },
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
