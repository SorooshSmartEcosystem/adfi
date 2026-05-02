export const metadata = { title: "terms · adfi" };

export default function TermsPage() {
  return (
    <>
      <h1 className="text-3xl font-medium tracking-tight mb-sm">terms of service</h1>
      <p className="font-mono text-xs text-ink4 tracking-widest uppercase mb-xl">
        last updated · may 2, 2026
      </p>

      <p className="mb-md">
        these terms govern your use of adfi.ca and the adfi mobile and
        admin apps (the &quot;service&quot;). the service is operated by
        SOROOSHX INC., a corporation incorporated in Ontario, Canada
        (&quot;adfi,&quot; &quot;we,&quot; &quot;us&quot;). by creating an
        account or using the service you agree to these terms.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">what adfi does</h2>
      <p className="mb-md">
        adfi is an ai marketing assistant for solopreneurs and small
        businesses. our agents draft content (captions, carousels, reel
        scripts, newsletters), manage inbound customer messages and calls,
        surface market signals, generate brand assets, and publish on your
        behalf to the channels you connect (instagram, facebook, linkedin,
        telegram, email, x/twitter, and others). our agents are
        multilingual. you remain responsible for what gets published under
        your name and for compliance with each connected channel&apos;s
        terms.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">your account</h2>
      <ul className="list-disc pl-lg flex flex-col gap-xs mb-md">
        <li>you must be 18 or older.</li>
        <li>
          keep your credentials safe. you&apos;re responsible for activity
          on your account.
        </li>
        <li>
          one business per account on solo and team plans; multiple
          businesses are supported on studio (up to 2) and agency (up to
          8) plans.
        </li>
        <li>
          one human per account. don&apos;t share login credentials. team
          collaboration features (when launched) will support multiple
          users per account.
        </li>
      </ul>

      <h2 className="text-xl font-medium mt-xl mb-sm">subscriptions, trials, and credits</h2>
      <p className="mb-md">
        adfi is offered on four monthly plans: solo, team, studio, and
        agency. plans bill monthly through stripe. new accounts get a
        7-day free trial of the team plan; trials end on the date shown
        in settings. if you don&apos;t add a payment method by the end of
        your trial, your account moves to a read-only state.
      </p>
      <p className="mb-md">
        each plan includes a monthly allowance of agent credits (used for
        content generation, image generation, video rendering, and
        outbound messages). credits reset on the 1st of each calendar
        month and do not roll over. if you exhaust your monthly credits,
        agent features pause until the next reset or until you upgrade.
      </p>
      <p className="mb-md">
        you can cancel any time from the customer portal in settings.
        cancellation ends future billing; the current period stays
        active through its end date. we do not provide refunds for partial
        periods except where required by law.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">agent output</h2>
      <p className="mb-md">
        the agents produce drafts, suggestions, and replies; you approve
        and publish them. we do not guarantee accuracy, suitability,
        compliance with any specific advertising standard, or commercial
        performance — please review every draft before publishing.
        you own the content you create with adfi (the &quot;output&quot;),
        subject to anthropic&apos;s and replicate&apos;s license terms for
        the underlying models that produced it. you grant us the
        non-exclusive license needed to host, render, transmit, and
        publish the output through the channels you connect.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">acceptable use</h2>
      <p className="mb-md">
        you may not use adfi to: send spam or unsolicited bulk messages;
        impersonate any person or business you don&apos;t have authority
        to represent; infringe anyone&apos;s intellectual-property,
        publicity, or privacy rights; promote unlawful goods or services;
        generate sexual content involving minors; doxx or harass any
        individual; evade the detection systems of any platform; or
        generate content designed to manipulate elections or public health
        outcomes. we may suspend or terminate accounts that violate these
        rules. we may also block specific outputs that violate our model
        providers&apos; usage policies.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">third-party channels</h2>
      <p className="mb-md">
        to publish to instagram, facebook, linkedin, telegram, twitter, or
        any other channel you must connect the channel yourself and accept
        its respective terms. we follow each channel&apos;s api and
        platform policies (including meta&apos;s platform terms,
        developer policies, and data use restrictions). we are not
        responsible for changes those platforms make to their apis,
        rate-limit decisions, or content-moderation actions they take
        against your account or your posts.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">privacy</h2>
      <p className="mb-md">
        SOROOSHX INC. acts as the data controller for personal data
        processed through the service. our handling of your data —
        including data we receive from meta through facebook login — is
        described in our{" "}
        <a className="underline" href="/privacy">
          privacy notice
        </a>
        .
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">disclaimers</h2>
      <p className="mb-md">
        the service is provided &quot;as is&quot; and &quot;as
        available.&quot; we make no warranties of any kind, express or
        implied, including merchantability, fitness for a particular
        purpose, non-infringement, or that the service will be
        uninterrupted, secure, or error-free.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">limitation of liability</h2>
      <p className="mb-md">
        to the maximum extent permitted by law, our aggregate liability
        for any claim arising out of or related to the service is limited
        to the greater of (a) the amount you paid us in the 12 months
        before the event giving rise to the claim or (b) one hundred
        canadian dollars (ca$100). we are not liable for indirect,
        consequential, incidental, special, or punitive damages, including
        lost profits, lost revenue, or lost data, even if we&apos;ve been
        advised of the possibility of such damages.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">indemnification</h2>
      <p className="mb-md">
        you agree to indemnify and hold harmless SOROOSHX INC., its
        directors, officers, employees, and contractors from any claim,
        loss, or liability (including reasonable legal fees) arising from
        your use of the service, your output, or your violation of these
        terms or any third-party rights.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">governing law and disputes</h2>
      <p className="mb-md">
        these terms are governed by the laws of the Province of Ontario
        and the federal laws of Canada applicable therein, without regard
        to conflict-of-laws principles. any dispute arising under these
        terms will be resolved by the courts of Ontario, Canada, and you
        consent to the exclusive jurisdiction of those courts. nothing in
        this section limits your rights as a consumer under the mandatory
        laws of your country of residence.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">changes</h2>
      <p className="mb-md">
        we may update these terms from time to time. material changes
        will be emailed to the address on your account and reflected here
        with a new &quot;last updated&quot; date. continued use of the
        service after changes take effect constitutes your acceptance of
        the updated terms.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">termination</h2>
      <p className="mb-md">
        you may terminate your account any time from settings. we may
        suspend or terminate your account for material breach of these
        terms with reasonable notice (immediate, where the breach is
        urgent or unlawful). on termination, your right to use the
        service ends; sections that by their nature should survive
        (intellectual property, disclaimers, liability, indemnification,
        governing law) survive termination.
      </p>

      <h2 className="text-xl font-medium mt-xl mb-sm">contact</h2>
      <p>
        SOROOSHX INC.<br />
        Ontario, Canada<br />
        legal:{" "}
        <a className="underline" href="mailto:legal@adfi.ca">
          legal@adfi.ca
        </a>
      </p>
    </>
  );
}
