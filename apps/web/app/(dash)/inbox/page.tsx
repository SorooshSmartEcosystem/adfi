import { redirect } from "next/navigation";
import { createServerClient } from "@orb/auth/server";
import { InboxPage } from "../../../components/inbox/inbox-page";

export default async function Inbox() {
  const supabase = await createServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/signin");

  return <InboxPage />;
}
