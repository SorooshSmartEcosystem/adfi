import { redirect } from "next/navigation";
import { createServerClient } from "@orb/auth/server";
import { ContentClient } from "./content-client";

export default async function ContentPage() {
  const supabase = await createServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/signin");

  return (
    <main className="min-h-screen flex items-center justify-center px-lg py-2xl">
      <ContentClient />
    </main>
  );
}
