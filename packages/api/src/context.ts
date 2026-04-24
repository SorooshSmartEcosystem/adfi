import { db } from "@orb/db";
import {
  createServerClient,
  getUserFromBearer,
} from "@orb/auth/server";
import {
  createClient,
  type Session,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import type { PrismaClient } from "@prisma/client";

export type Context = {
  db: PrismaClient;
  supabase: SupabaseClient;
  session: Session | null;
  user: User | null;
  headers: Headers;
};

type CreateContextOpts = {
  headers: Headers;
};

export async function createContext(
  opts: CreateContextOpts,
): Promise<Context> {
  const authHeader = opts.headers.get("authorization");

  // Bearer-token path (mobile): validate the JWT directly; skip cookie lookup.
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const user = await getUserFromBearer(token);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    // Plain anon client — only used by the public auth router, which mobile
    // doesn't hit (mobile calls supabase-js directly for sign-in).
    const supabase = createClient(url, key);
    return {
      db,
      supabase,
      session: null,
      user,
      headers: opts.headers,
    };
  }

  // Cookie path (web + admin). Use getUser() — it contacts Supabase Auth to
  // verify the access token and silently refreshes it via refresh_token if
  // expired. getSession() just reads local storage, which can be stale and
  // triggers the "insecure" warning Supabase logs.
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    db,
    supabase,
    session: null,
    user: user ?? null,
    headers: opts.headers,
  };
}
