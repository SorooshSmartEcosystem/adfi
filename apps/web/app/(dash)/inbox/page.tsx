import { redirect } from "next/navigation";
import { createServerClient } from "@orb/auth/server";
import { InboxPage } from "../../../components/inbox/inbox-page";
import { PageHero } from "../../../components/shared/page-hero";

export default async function Inbox() {
  const supabase = await createServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/signin");

  return (
    <>
      <PageHero
        title="inbox"
        sub="every call, sms, and dm — i replied to the easy ones in your voice."
        showLive
      />
      <InboxPage />
    </>
  );
}
