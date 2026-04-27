import Link from "next/link";
import { Orb } from "../../components/shared/orb";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-bg">
      <header className="border-b-hairline border-border">
        <div className="max-w-2xl mx-auto px-lg py-md flex items-center justify-between">
          <Link href="/" className="flex items-center gap-sm">
            <Orb size="xs" animated={false} ring={false} />
            <span className="font-medium tracking-tight">adfi</span>
          </Link>
          <Link
            href="/signin"
            className="font-mono text-xs text-ink3 hover:text-ink"
          >
            sign in →
          </Link>
        </div>
      </header>
      <article className="max-w-2xl mx-auto px-lg py-2xl prose-legal">
        {children}
        <footer className="mt-2xl pt-lg border-t-hairline border-border flex gap-md text-sm text-ink4 font-mono">
          <Link href="/privacy" className="hover:text-ink">privacy</Link>
          <Link href="/terms" className="hover:text-ink">terms</Link>
          <Link href="/cookies" className="hover:text-ink">cookies</Link>
        </footer>
      </article>
    </main>
  );
}
