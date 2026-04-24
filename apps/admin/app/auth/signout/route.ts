import { createServerClient } from "@orb/auth/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/signin", request.url), { status: 303 });
}
