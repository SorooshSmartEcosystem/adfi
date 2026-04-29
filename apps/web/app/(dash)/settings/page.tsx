import { redirect } from "next/navigation";
import { getCurrentUser } from "@orb/auth/server";
import { getDashUserAndHome } from "../../../lib/trpc-server";
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
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/signin");

  const { user, home } = await getDashUserAndHome();

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
              <span className="font-mono" dir="auto">
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
        <p className="text-sm text-ink3 mb-md max-w-[480px]" dir="auto">
          tap a row to see exactly what to do. instagram and linkedin connect
          buttons activate as soon as their oauth flows ship.
        </p>
        <ConnectionsList />
      </Section>

      <Section label="DANGER ZONE">
        <Card>
          <div className="flex items-center justify-between gap-md">
            <div>
              <div className="text-md font-medium mb-xs" dir="auto">delete account</div>
              <div className="text-sm text-ink3" dir="auto">
                this cannot be undone. you&apos;ll have 30 days to change your
                mind.
              </div>
            </div>
            <form action="/auth/signout" method="post">
              <button
                type="button"
                className="font-mono text-xs text-urgent border-hairline border-urgent rounded-full px-md py-[5px]"
              dir="auto">
                delete
              </button>
            </form>
          </div>
        </Card>
      </Section>
    </div>
  );
}
