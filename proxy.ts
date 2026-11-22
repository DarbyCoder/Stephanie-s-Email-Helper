import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Only the organizer area and the login page touch the session.
  // Public pages (/, /e/...) stay cookie-free.
  matcher: ["/admin/:path*", "/login"],
};
