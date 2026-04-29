import {
  createServerClient as supaCreateServerClient,
  type CookieOptions,
} from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Header names the middleware sets after validating the session.
// Pages read these directly to skip a second supabase.auth.getUser()
// network round-trip per navigation. See packages/auth/src/middleware.ts.
const USER_ID_HEADER = "x-orb-user-id";
const USER_EMAIL_HEADER = "x-orb-user-email";

// Lightweight current-user shape — just the bits a page actually
// needs to check `is logged in?` + `get id`. Pages that need the full
// User row can still call createServerClient().auth.getUser() but
// that adds the round-trip back.
export type CurrentUser = { id: string; email: string | null };

// Reads the user identity attached by middleware. Falls back to a
// real supabase.auth.getUser() call if the header is missing — that
// happens only when middleware was bypassed (very rare; e.g. a route
// excluded from the matcher pattern). Fast path: ~0ms. Slow path:
// ~150-300ms (same as before).
//
// **This is the function pages should call.** Replaces the pattern:
//
//   const supabase = await createServerClient();
//   const { data: { user } } = await supabase.auth.getUser();
//
// with:
//
//   const user = await getCurrentUser();
//
// Saves one Supabase Auth round-trip per server-rendered page.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const h = await headers();
  const id = h.get(USER_ID_HEADER);
  if (id) {
    return { id, email: h.get(USER_EMAIL_HEADER) };
  }
  // Fallback: middleware didn't set the header. Verify directly.
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? null };
}

export async function createServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set",
    );
  }
  return supaCreateServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component where cookies are read-only.
          // Middleware handles session refresh; safe to swallow.
        }
      },
    },
  });
}

// Service-role client — bypasses RLS. Use only in server-side route handlers
// where the request has already been authenticated. Useful for storage
// uploads and any cross-user admin work.
export function createServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set",
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Validates a JWT access token (from mobile clients) and returns the user.
// Used by the tRPC context when `Authorization: Bearer <token>` is present.
export async function getUserFromBearer(token: string): Promise<User | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set",
    );
  }
  const client = createClient(url, key);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
