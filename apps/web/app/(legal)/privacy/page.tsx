export const metadata = { title: "privacy · adfi" };

export default function PrivacyPage() {
  return (
    <>
      <h1 className="text-3xl font-medium tracking-tight mb-sm">privacy</h1>
      <p className="font-mono text-xs text-ink4 tracking-widest uppercase mb-xl">
        last updated · april 26, 2026
      </p>

      <p className="mb-md">
        adfi is operated by sorooshsmartecosystem inc. (&quot;adfi,&quot; &quot;we,&quot; &quot;us&quot;).
        this notice explains what data we collect when you use adfi.ca and its
        mobile and admin apps, why we collect it, and the choices you have.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">what we collect</h2>
      <ul className="list-disc pl-lg flex flex-col gap-xs mb-md">
        <li>
          <strong>account info</strong> — your email and (if you choose google
          sign-in) basic profile fields supabase auth returns to us.
        </li>
        <li>
          <strong>business profile</strong> — anything you enter in settings:
          business name, description, website, logo, content pillars,
          audience segments. you control these.
        </li>
        <li>
          <strong>connected channels</strong> — when you link instagram,
          facebook, linkedin, twilio, or sendgrid, we store the access tokens
          encrypted at rest and the minimum metadata needed to publish on
          your behalf (page id, account name).
        </li>
        <li>
          <strong>content + agent runs</strong> — the drafts our agents
          produce, posts you publish, post metrics, inbound messages and
          calls handled, and the prompts and responses each agent run sends
          to anthropic + replicate.
        </li>
        <li>
          <strong>billing</strong> — handled by stripe. we store your stripe
          customer id and subscription status; we do not see card numbers.
        </li>
      </ul>

      <h2 className="text-xl font-medium mt-xl mb-sm">how we use it</h2>
      <ul className="list-disc pl-lg flex flex-col gap-xs mb-md">
        <li>to run the agents you hired us to run.</li>
        <li>to render the dashboards, drafts, inbox, and analytics you see.</li>
        <li>
          to send transactional email (account, billing, draft notifications)
          and the newsletters you ask echo to send to your list.
        </li>
        <li>to detect abuse and meet our legal obligations.</li>
      </ul>
      <p className="mb-md">
        we do not sell your data and we do not train third-party models on
        it. anthropic and replicate process prompts as data processors under
        their respective agreements; both retain inputs only as long as
        needed to return a response and for their own abuse-prevention.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">third-party processors</h2>
      <ul className="list-disc pl-lg flex flex-col gap-xs mb-md">
        <li>supabase — auth, postgres database, file storage</li>
        <li>vercel — hosting</li>
        <li>stripe — payments + billing</li>
        <li>anthropic — claude (the agents&apos; reasoning)</li>
        <li>replicate — image generation for echo</li>
        <li>sendgrid — newsletter and transactional email</li>
        <li>twilio — phone numbers, sms, calls (when enabled)</li>
        <li>meta + linkedin — only when you connect those channels</li>
      </ul>

      <h2 className="text-xl font-medium mt-xl mb-sm">your rights</h2>
      <p className="mb-md">
        you can export or delete your account data any time. settings →
        account → request export, or email us at{" "}
        <a className="underline" href="mailto:privacy@adfi.ca">
          privacy@adfi.ca
        </a>
        . deletion is hard within 30 days for content data and immediate for
        connected-channel tokens.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">contact</h2>
      <p>
        privacy questions:{" "}
        <a className="underline" href="mailto:privacy@adfi.ca">
          privacy@adfi.ca
        </a>
      </p>
    </>
  );
}
