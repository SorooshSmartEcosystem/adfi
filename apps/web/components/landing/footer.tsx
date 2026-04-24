export function LandingFooter() {
  return (
    <footer className="border-t-hairline border-border py-xl px-lg">
      <div className="max-w-[1080px] mx-auto flex items-center justify-between flex-wrap gap-md">
        <div className="font-medium text-md tracking-tight">adfi.</div>
        <div className="flex items-center gap-lg">
          <a href="#" className="text-sm text-ink3 hover:text-ink">
            privacy
          </a>
          <a href="#" className="text-sm text-ink3 hover:text-ink">
            terms
          </a>
          <a href="#" className="text-sm text-ink3 hover:text-ink">
            contact
          </a>
          <a href="#" className="text-sm text-ink3 hover:text-ink">
            status
          </a>
        </div>
        <div className="font-mono text-xs text-ink4 tracking-[0.1em]">
          © 2026 ADFI · MADE FOR SOLOPRENEURS
        </div>
      </div>
    </footer>
  );
}
