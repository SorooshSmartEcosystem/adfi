import Link from "next/link";
import { Orb } from "../shared/orb";

export function AuthHomeLink() {
  return (
    <Link
      href="/"
      className="flex items-center gap-sm text-ink hover:opacity-80 transition-opacity mb-xl"
    >
      <Orb size="sm" ring={false} />
      <span className="font-medium text-md tracking-tight">adfi</span>
    </Link>
  );
}
