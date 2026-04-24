import Link from "next/link";

export function AuthHomeLink() {
  return (
    <Link
      href="/"
      className="flex items-center gap-sm text-ink hover:opacity-80 transition-opacity mb-xl"
    >
      <span
        className="w-[16px] h-[16px] rounded-full animate-breathe-dot"
        style={{ background: "radial-gradient(circle at 35% 30%, #333 0%, #111 60%)" }}
      />
      <span className="font-medium text-md tracking-tight">adfi</span>
    </Link>
  );
}
