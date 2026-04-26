export const metadata = { title: "cookies · adfi" };

export default function CookiesPage() {
  return (
    <>
      <h1 className="text-3xl font-medium tracking-tight mb-sm">cookies</h1>
      <p className="font-mono text-xs text-ink4 tracking-widest uppercase mb-xl">
        last updated · april 26, 2026
      </p>

      <p className="mb-md">
        we keep cookies to a minimum. here&apos;s the full list:
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">strictly necessary</h2>
      <ul className="list-disc pl-lg flex flex-col gap-xs mb-md">
        <li>
          <strong>supabase auth session</strong> — keeps you signed in. set
          on first login, removed when you sign out. you can&apos;t use the
          dashboard without this one.
        </li>
        <li>
          <strong>csrf token</strong> — prevents cross-site request forgery
          on form submissions.
        </li>
      </ul>

      <h2 className="text-xl font-medium mt-xl mb-sm">analytics</h2>
      <p className="mb-md">
        we use vercel speed insights for page-load timing — it stores no
        personal identifiers. we do not run google analytics, facebook
        pixel, or any cross-site tracker on adfi.ca.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">third-party iframes</h2>
      <p className="mb-md">
        the stripe customer portal opens in a separate redirect. stripe sets
        its own cookies there governed by{" "}
        <a className="underline" href="https://stripe.com/cookies-policy">
          stripe&apos;s cookie policy
        </a>
        .
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">opting out</h2>
      <p>
        you can clear cookies any time in your browser settings. blocking the
        auth session cookie will sign you out.
      </p>
    </>
  );
}
