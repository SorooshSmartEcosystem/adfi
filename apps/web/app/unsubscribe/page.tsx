import { db } from "@orb/db";

// Public unsubscribe page — accessed via the per-subscriber token that
// SendGrid embeds in every newsletter. No auth required (the token is
// the auth). One-click unsubscribe + a confirmation message.

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let result: "ok" | "missing" | "not_found" | "already" = "ok";
  let businessName = "";

  if (!token) {
    result = "missing";
  } else {
    const sub = await db.subscriber.findUnique({
      where: { unsubscribeToken: token },
      include: { user: { select: { businessDescription: true } } },
    });
    if (!sub) {
      result = "not_found";
    } else if (sub.status === "UNSUBSCRIBED") {
      result = "already";
      businessName =
        sub.user.businessDescription?.split(/[.\n]/)[0]?.slice(0, 40)?.trim() ||
        "this sender";
    } else {
      await db.subscriber.update({
        where: { id: sub.id },
        data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
      });
      businessName =
        sub.user.businessDescription?.split(/[.\n]/)[0]?.slice(0, 40)?.trim() ||
        "this sender";
    }
  }

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-lg py-2xl">
      <div className="w-full max-w-[440px] bg-white border-hairline border-border rounded-[16px] p-[24px] text-center">
        {result === "missing" ? (
          <>
            <h1 className="text-xl font-medium tracking-tight mb-sm">
              missing token
            </h1>
            <p className="text-sm text-ink3">
              this unsubscribe link is incomplete. open the original email
              and click the link there.
            </p>
          </>
        ) : result === "not_found" ? (
          <>
            <h1 className="text-xl font-medium tracking-tight mb-sm">
              already removed
            </h1>
            <p className="text-sm text-ink3">
              we couldn&apos;t find a subscription matching this link.
            </p>
          </>
        ) : result === "already" ? (
          <>
            <h1 className="text-xl font-medium tracking-tight mb-sm">
              you were already off the list.
            </h1>
            <p className="text-sm text-ink3">
              you won&apos;t hear from {businessName} again.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-medium tracking-tight mb-sm">
              you&apos;re unsubscribed.
            </h1>
            <p className="text-sm text-ink3">
              {businessName} won&apos;t email you again. sorry to see you go.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
