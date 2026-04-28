import Link from "next/link";
import { Orb } from "../../components/shared/orb";

// Mobile download landing. iOS + Android haven't shipped to the public
// stores yet — set the URLs below to TestFlight / Play internal-track
// links once they exist. Until then, both buttons render as disabled
// "coming soon" affordances so the page still conveys the two-platform
// story instead of a generic "soon".
const APP_STORE_URL: string | null = null;
const PLAY_STORE_URL: string | null = null;

function AppleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M14.5 10.5c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.2 0 2-1.1 2.8-2.3.9-1.3 1.2-2.6 1.2-2.7 0 0-2.3-.9-2.4-3.5zm-2.4-6.5c.6-.7 1-1.7.9-2.7-.9.1-2 .6-2.6 1.3-.5.6-1 1.7-.9 2.7 1 .1 2-.5 2.6-1.3z"/>
    </svg>
  );
}

function AndroidMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M14.5 9.6h-9c-.3 0-.5.2-.5.5v6.4c0 .3.2.5.5.5h.7v2.4c0 .3.2.6.6.6h.5c.3 0 .6-.3.6-.6V17h2.5v2.4c0 .3.2.6.6.6h.5c.3 0 .6-.3.6-.6V17h.7c.3 0 .5-.2.5-.5v-6.4c0-.3-.2-.5-.5-.5zM4 9.7c-.7 0-1.2.5-1.2 1.2v3.7c0 .7.5 1.2 1.2 1.2s1.2-.5 1.2-1.2v-3.7c0-.7-.5-1.2-1.2-1.2zm12 0c-.7 0-1.2.5-1.2 1.2v3.7c0 .7.5 1.2 1.2 1.2s1.2-.5 1.2-1.2v-3.7c0-.7-.5-1.2-1.2-1.2zm-1.7-1c0-1.6-.9-3-2.4-3.7l.8-1.5c0-.1 0-.2-.1-.3-.1 0-.2 0-.3.1l-.8 1.5C11 4.4 10.5 4.3 10 4.3s-1 .1-1.5.3l-.8-1.5c0-.1-.2-.1-.3-.1-.1.1-.1.2-.1.3l.8 1.5c-1.5.7-2.4 2.1-2.4 3.7v.4h8.6v-.4zM8.4 7.2c-.2 0-.4-.2-.4-.4 0-.2.2-.4.4-.4s.4.2.4.4c0 .3-.2.4-.4.4zm3.2 0c-.2 0-.4-.2-.4-.4 0-.2.2-.4.4-.4s.4.2.4.4c0 .3-.2.4-.4.4z"/>
    </svg>
  );
}

function StoreButton({
  href,
  icon,
  topLine,
  bottomLine,
  disabled,
}: {
  href: string | null;
  icon: React.ReactElement;
  topLine: string;
  bottomLine: string;
  disabled: boolean;
}) {
  const className =
    "flex items-center gap-md px-lg py-[14px] rounded-[14px] text-left transition-colors w-full";
  const inner = (
    <>
      <span className="shrink-0 text-ink">{icon}</span>
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-ink4">
          {topLine}
        </span>
        <span className="text-md font-medium text-ink">{bottomLine}</span>
      </span>
      <span className="ml-auto font-mono text-xs text-ink3">
        {disabled ? "soon" : "→"}
      </span>
    </>
  );
  if (disabled || !href) {
    return (
      <div
        className={`${className} bg-surface border-hairline border-border opacity-70 cursor-not-allowed`}
      >
        {inner}
      </div>
    );
  }
  return (
    <a href={href} className={`${className} bg-white border-hairline border-border hover:border-ink`}>
      {inner}
    </a>
  );
}

export default function DownloadPage() {
  return (
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center px-lg py-2xl">
      <Link
        href="/"
        className="absolute top-lg left-lg text-xs text-ink3 font-mono hover:text-ink"
      >
        ← adfi.ca
      </Link>
      <div className="w-full max-w-[460px] bg-white border-hairline border-border rounded-[20px] p-xl text-center">
        <div className="mx-auto mb-lg flex justify-center">
          <Orb size="lg" />
        </div>
        <h1 className="text-3xl font-medium tracking-tight mb-md">
          adfi on your phone.
        </h1>
        <p className="text-sm text-ink3 leading-relaxed mb-xl">
          download the mobile app for ios or android. both ship from one
          codebase — same drafts, same inbox, same dashboard you have on
          the web.
        </p>

        <div className="flex flex-col gap-sm mb-xl">
          <StoreButton
            href={APP_STORE_URL}
            icon={<AppleMark />}
            topLine="DOWNLOAD ON THE"
            bottomLine="app store"
            disabled={!APP_STORE_URL}
          />
          <StoreButton
            href={PLAY_STORE_URL}
            icon={<AndroidMark />}
            topLine="GET IT ON"
            bottomLine="google play"
            disabled={!PLAY_STORE_URL}
          />
        </div>

        {!APP_STORE_URL && !PLAY_STORE_URL ? (
          <div className="text-[11px] font-mono uppercase tracking-[0.1em] text-ink4 mb-md">
            apps shipping soon · use the web in the meantime
          </div>
        ) : null}

        <Link
          href="/signup"
          className="block bg-ink text-white py-[13px] rounded-full text-md font-medium hover:opacity-85 transition-opacity"
        >
          use the web app →
        </Link>

        <div className="mt-lg text-sm text-ink3">
          already have an account?{" "}
          <Link href="/signin" className="text-ink underline">
            sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
