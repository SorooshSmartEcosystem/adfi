import { redirect } from "next/navigation";
import { createServerClient } from "@orb/auth/server";
import { trpcServer } from "../../../lib/trpc-server";
import { Card } from "../../../components/shared/card";
import { Row, Section } from "../../../components/settings/section";
import { BillingCard } from "../../../components/settings/billing-card";
import { SubscribersCard } from "../../../components/settings/subscribers-card";
import { PreferencesCard } from "../../../components/settings/preferences-card";
import { BusinessProfileCard } from "../../../components/settings/business-profile-card";
import { ConnectionsList } from "../../../components/settings/connect-card";
import { PageHero } from "../../../components/shared/page-hero";

function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "not set up";
  const m = raw.match(/^\+(\d{1,2})(\d{3})(\d{3})(\d{4})$/);
  if (!m) return raw;
  const [, c, a, p, l] = m;
  return `+${c} (${a}) ${p}-${l}`;
}

export default async function SettingsPage() {
  const supabase = await createServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/signin");

  const trpc = await trpcServer();
  const [user, home] = await Promise.all([
    trpc.user.me(),
    trpc.user.getHomeData(),
  ]);

  return (
    <div className="max-w-[680px]">
      <PageHero
        title="settings"
        sub="business profile, plan, and connected channels."
      />
      <Section label="BUSINESS">
        <BusinessProfileCard />
      </Section>

      <Section label="ACCOUNT">
        <Card padded={false}>
          <Row label="email" value={user.email ?? "—"} />
          <Row label="phone" value={user.phone ?? "—"} />
          <Row
            label="your adfi number"
            value={
              <span className="font-mono">
                {formatPhone(home.phoneStatus.active ? home.phoneStatus.number : null)}
              </span>
            }
            isLast
          />
        </Card>
      </Section>

      <Section label="PLAN">
        <BillingCard />
      </Section>

      <Section label="NEWSLETTER LIST">
        <SubscribersCard />
      </Section>

      <Section label="PREFERENCES">
        <PreferencesCard />
      </Section>

      <Section label="CONNECT YOUR CHANNELS" anchor="channels">
        <p className="text-sm text-ink3 mb-md max-w-[480px]">
          tap a row to see exactly what to do. instagram and linkedin connect
          buttons activate as soon as their oauth flows ship.
        </p>
        <ConnectionsList />
      </Section>

      <Section label="DANGER ZONE">
        <Card>
          <div className="flex items-center justify-between gap-md">
            <div>
              <div className="text-md font-medium mb-xs">delete account</div>
              <div className="text-sm text-ink3">
                this cannot be undone. you&apos;ll have 30 days to change your
                mind.
              </div>
            </div>
            <form action="/auth/signout" method="post">
              <button
                type="button"
                className="font-mono text-xs text-urgent border-hairline border-urgent rounded-full px-md py-[5px]"
              >
                delete
              </button>
            </form>
          </div>
        </Card>
      </Section>
    </div>
  );
}
