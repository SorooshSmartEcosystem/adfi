import Link from "next/link";
import { Orb } from "../shared/orb";

export function LandingNav({
  isAuthed = false,
  userInitial = "M",
  userLabel = null,
}: {
  isAuthed?: boolean;
  userInitial?: string;
  userLabel?: string | null;
}) {
  return (
    <nav className="sticky top-0 z-50 topbar-blur border-b-hairline border-border">
      <div className="max-w-[1080px] mx-auto px-lg flex items-center justify-between py-md">
        <Link href="/" className="flex items-center gap-sm font-medium text-md tracking-tight text-ink">
          <Orb size="sm" ring={false} />
          <span>adfi</span>
        </Link>
        <div className="flex items-center gap-lg">
          <a href="#pricing" className="text-sm text-ink3 hover:text-ink transition-colors">
            pricing
          </a>
          <a href="#faq" className="text-sm text-ink3 hover:text-ink transition-colors">
            faq
          </a>
          {isAuthed ? (
            <Link
              href="/dashboard"
              aria-label={userLabel ? `open dashboard (${userLabel})` : "open dashboard"}
              title={userLabel ?? "open dashboard"}
              className="w-9 h-9 rounded-full bg-ink text-white flex items-center justify-center font-medium text-sm hover:opacity-85 transition-opacity"
            >
              {userInitial}
            </Link>
          ) : (
            <>
              <Link
                href="/signin"
                className="text-sm text-ink3 hover:text-ink transition-colors"
              >
                log in
              </Link>
              <Link
                href="/signup"
                className="bg-ink text-white px-md py-[8px] rounded-full text-sm font-medium"
              >
                get started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
