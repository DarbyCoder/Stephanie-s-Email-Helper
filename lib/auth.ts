import { cache } from "react";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";

/**
 * Use at the top of every admin data loader and Server Action.
 * Returns a Supabase client for the signed-in organizer, or redirects:
 * not signed in -> /login, signed in but not on the admins allowlist -> /not-authorized.
 */
export const requireOrganizer = cache(async () => {
  const supabase = await createSessionClient();

  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error) throw new Error(`Could not check organizer access: ${error.message}`);
  if (!isAdmin) redirect("/not-authorized");

  return supabase;
});
