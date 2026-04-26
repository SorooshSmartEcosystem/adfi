import { NextResponse } from "next/server";
import { createServerClient } from "@orb/auth/server";

// Returns null when caller is an admin; otherwise a NextResponse the route
// should return immediately. Use at the top of every /api/debug/* route so
// production can't be probed by anonymous users.
export async function requireAdmin(): Promise<NextResponse | null> {
  const allowedEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (allowedEmails.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase();
  if (!email || !allowedEmails.includes(email)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return null;
}
