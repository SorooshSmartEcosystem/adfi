import Link from "next/link";
import { Orb } from "../../components/shared/orb";

// Mobile download landing. iOS + Android haven't shipped yet, so the
// page tells the visitor that and points them at the web app in the
// meantime. Replace the placeholder hrefs below with the real App
// Store / Play Store links once the apps go live.
const APP_STORE_URL: string | null = null;
const PLAY_STORE_URL: string | null = null;

export default function DownloadPage() {
  const live = APP_STORE_URL || PLAY_STORE_URL;

  return (
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center px-lg py-2xl">
      <Link
        href="/"
        className="absolute top-lg left-lg text-xs text-ink3 font-mono hover:text-ink"
      >
        ← adfi.ca
      </Link>
      <div className="w-full max-w-[440px] bg-white border-hairline border-border rounded-[20px] p-xl text-center">
        <div className="mx-auto mb-lg flex justify-center">
          <Orb size="lg" />
        </div>
        <h1 className="text-3xl font-medium tracking-tight mb-md">
          adfi on your phone.
        </h1>
        <p className="text-sm text-ink3 leading-relaxed mb-xl">
          ios + android — coming to the app store and google play. in the
          meantime, the web app does everything: drafts, inbox, dashboard,
          billing.
        </p>

        {live ? (
          <div className="flex flex-col gap-sm mb-xl">
            {APP_STORE_URL ? (
              <a
                href={APP_STORE_URL}
                className="bg-ink text-white py-[13px] rounded-full text-md font-medium"
              >
                download for iphone →
              </a>
            ) : null}
            {PLAY_STORE_URL ? (
              <a
                href={PLAY_STORE_URL}
                className="bg-ink text-white py-[13px] rounded-full text-md font-medium"
              >
                download for android →
              </a>
            ) : null}
          </div>
        ) : (
          <div className="bg-bg border-hairline border-border rounded-[12px] p-md mb-xl">
            <div className="text-xs font-mono text-ink4 mb-xs">
              IOS · ANDROID
            </div>
            <div className="text-sm text-ink2">
              shipping to the app stores soon. the entire product runs in your
              browser today — open it and pin the tab.
            </div>
          </div>
        )}

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
