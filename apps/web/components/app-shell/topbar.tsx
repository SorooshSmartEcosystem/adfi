"use client";

import Link from "next/link";

export function Topbar({
  title,
  sub,
  onToggleSidebar,
}: {
  title: string;
  sub: string;
  onToggleSidebar: () => void;
}) {
  return (
    <header className="h-[60px] border-b-hairline border-border topbar-blur flex items-center justify-between px-xl sticky top-0 z-40">
      <div className="flex items-center gap-md min-w-0 flex-1">
        <button
          aria-label="open menu"
          onClick={onToggleSidebar}
          className="w-8 h-8 flex flex-col justify-center items-center lg:hidden"
        >
          <span className="w-[18px] h-px bg-ink my-[3px]" />
          <span className="w-[18px] h-px bg-ink my-[3px]" />
          <span className="w-[18px] h-px bg-ink my-[3px]" />
        </button>
        <div>
          <div className="text-md font-medium">{title}</div>
          <div className="font-mono text-xs text-ink4">{sub}</div>
        </div>
      </div>
      <div className="flex items-center gap-sm shrink-0">
        <Link
          href="/"
          className="font-mono text-xs text-ink3 hover:text-ink transition-colors px-sm"
        >
          adfi.ca ↗
        </Link>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="px-md py-[7px] rounded-full text-xs font-medium text-ink2 border-hairline border-border hover:border-ink hover:text-ink transition-colors"
          >
            log out
          </button>
        </form>
      </div>
    </header>
  );
}
