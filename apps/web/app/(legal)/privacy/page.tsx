export const metadata = { title: "privacy · adfi" };

export default function PrivacyPage() {
  return (
    <>
      <h1 className="text-3xl font-medium tracking-tight mb-sm">privacy</h1>
      <p className="font-mono text-xs text-ink4 tracking-widest uppercase mb-xl">
        last updated · may 2, 2026
      </p>

      <p className="mb-md">
        adfi is operated by SOROOSHX INC., a corporation incorporated in
        Ontario, Canada (&quot;adfi,&quot; &quot;we,&quot; &quot;us&quot;).
        SOROOSHX INC. is the data controller for personal data we collect
        and process through adfi.ca and the adfi mobile and admin apps
        (collectively, the &quot;service&quot;). this notice explains what
        data we collect, why we collect it, who we share it with, and the
        choices you have.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">what we collect</h2>
      <ul className="list-disc pl-lg flex flex-col gap-xs mb-md">
        <li>
          <strong>account info</strong> — your email and (if you choose
          google sign-in) the basic profile fields supabase auth returns to
          us. we do not collect government ids.
        </li>
        <li>
          <strong>business profile</strong> — anything you enter during
          onboarding or in settings: business name, description, website,
          logo, content pillars, audience segments, brand voice. you control
          all of these and can edit or delete them at any time. on
          studio/agency plans you may run multiple businesses under one
          account; each business&apos;s data is scoped to that business.
        </li>
        <li>
          <strong>connected channels</strong> — when you link instagram,
          facebook, linkedin, telegram, twilio, sendgrid, or any other
          channel, we store the access tokens encrypted at rest (aes-256,
          application-layer) and the minimum metadata needed to publish on
          your behalf (page id, page name, account id, instagram business
          id).
        </li>
        <li>
          <strong>meta platform data</strong> — when you connect a facebook
          page or instagram business account via facebook login, meta makes
          available to us: the list of pages you manage (so we can show a
          page picker), the page id and page access token for the page you
          select, the linked instagram business id, page-level engagement
          metrics (reach, reactions, comments) for posts on the connected
          page, and the contents of inbound messenger and instagram-dm
          conversations on the connected page. this data is processed only
          for the features you use it for (publishing, dashboard analytics,
          dm auto-reply via the signal agent).
        </li>
        <li>
          <strong>content + agent activity</strong> — the drafts our agents
          produce, posts you publish, post performance metrics, inbound
          messages and calls handled by signal, and the prompts and
          responses each agent run sends to anthropic and replicate.
        </li>
        <li>
          <strong>billing</strong> — handled by stripe. we store your
          stripe customer id and subscription status; we never see card
          numbers or full payment instruments.
        </li>
      </ul>

      <h2 className="text-xl font-medium mt-xl mb-sm">how we use it</h2>
      <ul className="list-disc pl-lg flex flex-col gap-xs mb-md">
        <li>to run the agents you hired us to run.</li>
        <li>
          to render the dashboards, drafts, inbox, and analytics you see in
          the app.
        </li>
        <li>
          to send transactional email (account, billing, draft
          notifications) and the newsletters you ask echo to send to your
          subscribers.
        </li>
        <li>
          to detect abuse and enforce platform terms (ours and connected
          channels&apos;).
        </li>
        <li>to meet our legal and tax obligations.</li>
      </ul>
      <p className="mb-md">
        we do not sell your data. we do not use it to train third-party
        models. anthropic and replicate process prompts as data processors
        under their respective agreements; both retain inputs only as long
        as needed to return a response and for their own
        abuse-prevention. we do not pass meta access tokens, customer phone
        numbers, or full payment instruments to anthropic or replicate.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">third-party processors</h2>
      <p className="mb-md">
        we use the processors below to operate the service. each processes
        your data only on our instructions and only for the purposes
        described.
      </p>
      <ul className="list-disc pl-lg flex flex-col gap-xs mb-md">
        <li>
          <strong>supabase inc.</strong> (united states) — postgres
          database, auth, file storage. stores all account, business,
          content, and connected-channel records. tokens are
          application-layer encrypted before write; supabase only sees
          ciphertext.
        </li>
        <li>
          <strong>vercel inc.</strong> (united states) — application
          hosting, serverless runtime, edge network. handles all api
          requests; no persistent storage of user data.
        </li>
        <li>
          <strong>anthropic pbc</strong> (united states) — claude api for
          agent reasoning (echo, signal, strategist, planner, scout,
          pulse). processes the prompts and responses for each agent run.
        </li>
        <li>
          <strong>replicate, inc.</strong> (united states) — image
          generation for echo (flux schnell). processes only image prompts.
        </li>
        <li>
          <strong>stripe, inc.</strong> (united states) — payments,
          subscriptions, customer portal. processes payment instruments and
          billing data directly.
        </li>
        <li>
          <strong>sendgrid (twilio inc.)</strong> (united states) —
          newsletter delivery, transactional email, subscriber management.
        </li>
        <li>
          <strong>twilio inc.</strong> (united states) — phone numbers,
          sms, voice calls (signal agent — only when enabled).
        </li>
        <li>
          <strong>meta platforms inc., linkedin corporation, telegram fz-llc</strong>
          {" "}— only when you explicitly connect those channels.
        </li>
      </ul>

      <h2 className="text-xl font-medium mt-xl mb-sm">international transfers</h2>
      <p className="mb-md">
        our processors are primarily based in the united states. if you
        access the service from the european union, the united kingdom, or
        another jurisdiction with cross-border transfer restrictions, your
        data is transferred to the united states under standard
        contractual clauses (sccs) and equivalent safeguards published by
        each processor.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">retention</h2>
      <p className="mb-md">
        we retain account, business, and content data for as long as your
        account is active. when you disconnect a channel, the associated
        access tokens and channel-specific data are deleted within 30
        days. when you delete your account, all personal data is deleted
        within 30 days; backups are purged within 90 days. data we are
        legally required to keep (billing records for tax purposes,
        records of fraud or abuse) is retained for the period required by
        law.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">security</h2>
      <p className="mb-md">
        all traffic between you, our service, and our processors is
        encrypted in transit with tls 1.2 or higher. data at rest in
        supabase postgres is encrypted with aes-256. access tokens for
        connected channels are additionally encrypted at the application
        layer before they are written to the database. access to
        production systems is restricted to authenticated personnel and
        audited.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">your rights</h2>
      <p className="mb-md">
        depending on your jurisdiction (gdpr, uk gdpr, ccpa, pipeda, and
        equivalents) you have the right to: access the personal data we
        hold about you; correct inaccurate data; delete your data;
        restrict or object to processing; data portability; and lodge a
        complaint with your local supervisory authority.
      </p>
      <p className="mb-md">
        you can export or delete your account data any time. settings →
        account → request export, or email us at{" "}
        <a className="underline" href="mailto:privacy@adfi.ca">
          privacy@adfi.ca
        </a>
        . deletion is hard within 30 days for content data and immediate
        for connected-channel tokens.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">government requests</h2>
      <p className="mb-md">
        if a government authority requests personal data from us, we
        review every request for legality, push back on overreach,
        disclose only the minimum information legally required, and
        document our response. we will notify you of any request that
        concerns your data unless legally prohibited from doing so.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">children</h2>
      <p className="mb-md">
        adfi is not intended for users under 18. we do not knowingly
        collect personal data from anyone under 18. if you believe a child
        has provided us with personal data, contact{" "}
        <a className="underline" href="mailto:privacy@adfi.ca">
          privacy@adfi.ca
        </a>{" "}
        and we will delete it.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">changes to this notice</h2>
      <p className="mb-md">
        we may update this notice from time to time. material changes will
        be emailed to the address on your account and reflected here with
        a new &quot;last updated&quot; date.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">contact</h2>
      <p>
        SOROOSHX INC.<br />
        Ontario, Canada<br />
        privacy questions:{" "}
        <a className="underline" href="mailto:privacy@adfi.ca">
          privacy@adfi.ca
        </a>
      </p>
    </>
  );
}
