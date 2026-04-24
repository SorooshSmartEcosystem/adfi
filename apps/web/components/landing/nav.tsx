import Link from "next/link";

export function LandingNav() {
  return (
    <nav className="sticky top-0 z-50 topbar-blur border-b-hairline border-border">
      <div className="max-w-[1080px] mx-auto px-lg flex items-center justify-between py-md">
        <Link href="/" className="flex items-center gap-sm font-medium text-md tracking-tight text-ink">
          <span
            className="w-[16px] h-[16px] rounded-full animate-breathe-dot"
            style={{ background: "radial-gradient(circle at 35% 30%, #333 0%, #111 60%)" }}
          />
          <span>adfi</span>
        </Link>
        <div className="flex items-center gap-lg">
          <a href="#pricing" className="text-sm text-ink3 hover:text-ink transition-colors">
            pricing
          </a>
          <a href="#faq" className="text-sm text-ink3 hover:text-ink transition-colors">
            faq
          </a>
          <Link
            href="/signin"
            className="bg-ink text-white px-md py-[8px] rounded-full text-sm font-medium"
          >
            get the app
          </Link>
        </div>
      </div>
    </nav>
  );
}
