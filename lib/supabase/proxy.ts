import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "./config";

/**
 * Refreshes the organizer's session cookie and does the optimistic redirects:
 * signed out on /admin -> /login, signed in on /login -> /admin.
 * Real authorization happens in requireOrganizer() and in Postgres RLS.
 */
export async function updateSession(request: NextRequest) {
  const { url, key } = supabaseConfig();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [header, value] of Object.entries(headers)) {
          response.headers.set(header, value);
        }
      },
    },
  });

  // Verifies the JWT and refreshes it if needed. Keep this the first call.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const { pathname, search } = request.nextUrl;

  if (!signedIn && pathname.startsWith("/admin")) {
    const target = new URL("/login", request.url);
    target.searchParams.set("next", pathname + search);
    return redirectKeepingCookies(target, response);
  }

  if (signedIn && pathname === "/login") {
    return redirectKeepingCookies(new URL("/admin", request.url), response);
  }

  return response;
}

function redirectKeepingCookies(target: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(target);
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}
