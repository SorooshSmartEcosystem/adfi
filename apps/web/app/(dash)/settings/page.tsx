import { redirect } from "next/navigation";
import { createServerClient } from "@orb/auth/server";
import { trpcServer } from "../../../lib/trpc-server";
import { Card } from "../../../components/shared/card";
import { Row, Section } from "../../../components/settings/section";
import { StatusDot } from "../../../components/shared/status-dot";

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

  const businessName =
    user.businessDescription?.split(/[.\n]/)[0]?.slice(0, 40)?.trim() ||
    "—";

  return (
    <div className="max-w-[680px]">
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
          />
          <Row label="business" value={businessName} isLast />
        </Card>
      </Section>

      <Section label="PLAN">
        <Card>
          <div className="flex items-start justify-between mb-md">
            <div>
              <div className="text-lg font-medium">
                {home.trialDaysLeft && home.trialDaysLeft > 0
                  ? "trial · monthly"
                  : "team · monthly"}
              </div>
              <div className="font-mono text-sm text-ink4 mt-xs">
                {home.trialDaysLeft && home.trialDaysLeft > 0
                  ? `${home.trialDaysLeft} DAYS LEFT · NO CHARGE YET`
                  : "$99/MO"}
              </div>
            </div>
            <span className="font-mono text-[10px] bg-alive text-[#1a4a2c] px-md py-[3px] rounded-full tracking-[0.1em]">
              ACTIVE
            </span>
          </div>
          <div className="flex items-center gap-md flex-wrap">
            <ChipButton label="change plan" />
            <ChipButton label="billing history" />
            <ChipButton label="update card" />
          </div>
        </Card>
      </Section>

      <Section label="CONNECTED ACCOUNTS">
        <Card padded={false}>
          <ConnectionRow
            code="IG"
            name="Instagram"
            status="not connected"
            connected={false}
          />
          <ConnectionRow
            code="LI"
            name="LinkedIn"
            status="not connected"
            connected={false}
          />
          <ConnectionRow
            code="FB"
            name="Facebook"
            status="coming soon"
            soon
            isLast
          />
        </Card>
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

function ChipButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="font-mono text-xs text-ink2 border-hairline border-border rounded-full px-md py-[5px] hover:border-ink hover:text-ink transition-colors"
    >
      {label}
    </button>
  );
}

function ConnectionRow({
  code,
  name,
  status,
  connected = false,
  soon = false,
  isLast = false,
}: {
  code: string;
  name: string;
  status: string;
  connected?: boolean;
  soon?: boolean;
  isLast?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-lg py-md ${isLast ? "" : "hairline-b2 border-border2"}`}
    >
      <div className="flex items-center gap-md">
        <div className="w-7 h-7 rounded-md bg-surface flex items-center justify-center font-mono text-sm font-medium">
          {code}
        </div>
        <div>
          <div className="text-md font-medium">{name}</div>
          <div className="font-mono text-sm text-ink4">{status}</div>
        </div>
      </div>
      {connected ? (
        <StatusDot tone="alive" animated />
      ) : soon ? (
        <span className="font-mono text-xs text-ink5 tracking-[0.1em]">
          SOON
        </span>
      ) : (
        <button className="font-mono text-xs text-ink2 border-hairline border-border rounded-full px-md py-[5px] hover:border-ink hover:text-ink transition-colors">
          connect
        </button>
      )}
    </div>
  );
}
