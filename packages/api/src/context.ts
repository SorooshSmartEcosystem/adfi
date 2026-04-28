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
  // Resolved once per request batch (not per-procedure), so a page that
  // batches 5 tRPC queries pays one currentBusinessId lookup instead of
  // five. Null when there's no authed user. The authedProc middleware
  // self-heals if this is null but the user IS authed (legacy account
  // missing a Business).
  currentBusinessId: string | null;
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
    const currentBusinessId = await resolveCurrentBusinessId(user?.id ?? null);
    return {
      db,
      supabase,
      session: null,
      user,
      headers: opts.headers,
      currentBusinessId,
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
  const currentBusinessId = await resolveCurrentBusinessId(user?.id ?? null);

  return {
    db,
    supabase,
    session: null,
    user: user ?? null,
    headers: opts.headers,
    currentBusinessId,
  };
}

// One indexed PK lookup, run once per HTTP request batch. Procedures
// downstream read ctx.currentBusinessId for free. Returns null for
// unauthenticated requests; the authedProc middleware bootstraps a
// Business if a real authed user lands here without one.
async function resolveCurrentBusinessId(
  userId: string | null,
): Promise<string | null> {
  if (!userId) return null;
  const row = await db.user.findUnique({
    where: { id: userId },
    select: { currentBusinessId: true },
  });
  return row?.currentBusinessId ?? null;
}
