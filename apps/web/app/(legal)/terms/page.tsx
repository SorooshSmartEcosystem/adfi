export const metadata = { title: "terms · adfi" };

export default function TermsPage() {
  return (
    <>
      <h1 className="text-3xl font-medium tracking-tight mb-sm">terms of service</h1>
      <p className="font-mono text-xs text-ink4 tracking-widest uppercase mb-xl">
        last updated · april 26, 2026
      </p>

      <p className="mb-md">
        these terms govern your use of adfi.ca and the adfi mobile + admin
        apps (the &quot;service&quot;). by creating an account or using the
        service you agree to them.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">what adfi does</h2>
      <p className="mb-md">
        adfi is an ai marketing team for solopreneurs. our agents draft
        content, manage inbound calls and messages, surface market signals,
        and publish on your behalf to the channels you connect. you remain
        responsible for what gets published under your name and for
        compliance with each channel&apos;s terms (instagram, linkedin, etc.).
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">your account</h2>
      <ul className="list-disc pl-lg flex flex-col gap-xs mb-md">
        <li>you must be 18 or older.</li>
        <li>
          keep your credentials safe. you&apos;re responsible for activity on
          your account.
        </li>
        <li>
          one account per business unless you&apos;ve subscribed to a plan
          that explicitly allows multiple.
        </li>
      </ul>

      <h2 className="text-xl font-medium mt-xl mb-sm">subscriptions + trials</h2>
      <p className="mb-md">
        plans bill monthly through stripe. trials end on the date shown in
        settings; if you don&apos;t add a payment method by then your account
        moves to a read-only state. monthly credits reset on the 1st and do
        not roll over. cancel anytime from the customer portal — cancellation
        ends future billing; the current period stays active through its end.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">agent output</h2>
      <p className="mb-md">
        the agents produce drafts; you approve them. we do not guarantee
        accuracy, suitability, or performance — please review before
        publishing. you own the content you create with adfi (the
        &quot;output&quot;), subject to anthropic&apos;s and replicate&apos;s
        license terms for the models that produced it. you grant us the
        license needed to host, render, and publish the output through the
        channels you connect.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">acceptable use</h2>
      <p className="mb-md">
        you may not use adfi to: send spam, impersonate others, infringe
        anyone&apos;s rights, run unlawful businesses, generate content that
        sexualises minors, doxx people, or evade platform detection. we may
        suspend or terminate accounts that violate these rules. we may also
        block specific outputs that violate our model providers&apos; usage
        policies.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">third-party channels</h2>
      <p className="mb-md">
        to publish to instagram, facebook, linkedin, etc. you must connect
        those channels yourself and accept their respective terms. we are
        not responsible for changes those platforms make to their apis or
        for content moderation decisions they make about your posts.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">disclaimers + liability</h2>
      <p className="mb-md">
        the service is provided &quot;as is.&quot; to the maximum extent
        permitted by law, our aggregate liability is limited to the amount
        you paid us in the 12 months before the event giving rise to the
        claim. we&apos;re not liable for indirect or consequential damages.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">changes</h2>
      <p className="mb-md">
        we may update these terms. material changes will be emailed to the
        address on your account and reflected here with a new &quot;last
        updated&quot; date.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">contact</h2>
      <p>
        legal:{" "}
        <a className="underline" href="mailto:legal@adfi.ca">
          legal@adfi.ca
        </a>
      </p>
    </>
  );
}
