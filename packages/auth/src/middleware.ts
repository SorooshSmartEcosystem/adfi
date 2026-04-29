import {
  createServerClient,
  type CookieOptions,
} from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Header names the page handlers read to skip a second auth round-trip.
// See packages/auth/src/server.ts → getCurrentUserFromHeaders().
const USER_ID_HEADER = "x-orb-user-id";
const USER_EMAIL_HEADER = "x-orb-user-email";

export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set",
    );
  }

  // Build a mutable copy of the request headers we'll forward to the
  // route handler. Middleware can attach metadata here that page
  // handlers later read via `next/headers`. Using this to pass the
  // already-validated user across runtime boundaries so the page
  // handler doesn't need to re-call supabase.auth.getUser() — saves
  // one full Auth round-trip (~150-300ms) on every navigation.
  const requestHeaders = new Headers(request.headers);
  // Defensive: never let a client spoof the auth headers by sending
  // them. Strip anything inbound; only middleware sets these.
  requestHeaders.delete(USER_ID_HEADER);
  requestHeaders.delete(USER_EMAIL_HEADER);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({
          request: { headers: requestHeaders },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refreshes the JWT on every request; without this, tokens silently
  // expire. Also gives us the validated user identity to forward to
  // the page handler.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    requestHeaders.set(USER_ID_HEADER, user.id);
    if (user.email) requestHeaders.set(USER_EMAIL_HEADER, user.email);
    // Re-emit the response with the updated headers attached. This
    // overwrites the previous NextResponse.next() created above.
    const cookiesToCarry = response.cookies.getAll();
    response = NextResponse.next({ request: { headers: requestHeaders } });
    for (const c of cookiesToCarry) {
      response.cookies.set(c.name, c.value, c);
    }
  }

  return response;
}
