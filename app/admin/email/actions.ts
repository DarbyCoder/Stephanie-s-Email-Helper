"use server";

import { revalidatePath } from "next/cache";
import { requireOrganizer } from "@/lib/auth";
import { isUuid } from "@/lib/validation";

export async function markEventsSent(eventIds: string[]): Promise<{ error: string | null; count: number }> {
  const supabase = await requireOrganizer();
  const ids = eventIds.filter(isUuid);
  if (ids.length === 0) return { error: "Select at least one event.", count: 0 };

  const { data, error } = await supabase.from("events").update({ email_sent: true }).in("id", ids).select("id");
  if (error) return { error: `Could not update events: ${error.message}`, count: 0 };

  revalidatePath("/admin", "layout");
  return { error: null, count: data.length };
}
