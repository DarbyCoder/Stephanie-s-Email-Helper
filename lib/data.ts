import { cache } from "react";
import { connection } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createPublicClient } from "@/lib/supabase/server";
import { hasEnded, nowInBoston } from "@/lib/dates";
import { SLUG_PATTERN } from "@/lib/slug";
import { isUuid } from "@/lib/validation";
import type { EventRow, PublicEvent, Settings, Volunteer, WithSpots } from "@/lib/types";

// Must match the column grants for `anon` in the migration.
export const PUBLIC_EVENT_COLUMNS =
  "id,name,tagline,date,start_time,end_time,location_type,location_text,location_lat,location_lng,volunteers_needed,slug";

/** Adds `spots_filled` to each event (via a function that exposes counts only). */
async function withSpots<T extends { id: string }>(
  supabase: SupabaseClient,
  events: T[],
): Promise<WithSpots<T>[]> {
  if (events.length === 0) return [];
  const { data, error } = await supabase.rpc("get_spots_filled", { event_ids: events.map((e) => e.id) });
  if (error) throw new Error(`Could not load sign-up counts: ${error.message}`);
  const counts = new Map(
    (data as { event_id: string; spots_filled: number }[]).map((row) => [row.event_id, row.spots_filled]),
  );
  return events.map((event) => ({ ...event, spots_filled: counts.get(event.id) ?? 0 }));
}

// ---------- Public (no session) ----------

export const getPublicEvent = cache(async (slug: string) => {
  await connection(); // always fresh: spot counts change with every sign-up
  if (!SLUG_PATTERN.test(slug)) return null;
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("events")
    .select(PUBLIC_EVENT_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`Could not load event: ${error.message}`);
  if (!data) return null;
  const [event] = await withSpots(supabase, [data as PublicEvent]);
  return event;
});

export async function getUpcomingPublicEvents() {
  await connection();
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("events")
    .select(PUBLIC_EVENT_COLUMNS)
    .gte("date", nowInBoston().date)
    .order("date")
    .order("start_time");
  if (error) throw new Error(`Could not load events: ${error.message}`);
  const upcoming = (data as PublicEvent[]).filter((event) => !hasEnded(event));
  return withSpots(supabase, upcoming);
}

// ---------- Organizer (pass the client from requireOrganizer) ----------

export async function getAllEvents(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("events").select("*").order("date").order("start_time");
  if (error) throw new Error(`Could not load events: ${error.message}`);
  return withSpots(supabase, data as EventRow[]);
}

export async function getEvent(supabase: SupabaseClient, id: string) {
  if (!isUuid(id)) return null;
  const { data, error } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not load event: ${error.message}`);
  if (!data) return null;
  const [event] = await withSpots(supabase, [data as EventRow]);
  return event;
}

export async function getVolunteers(supabase: SupabaseClient, eventId: string) {
  const { data, error } = await supabase
    .from("volunteers")
    .select("id,event_id,name,email,created_at")
    .eq("event_id", eventId)
    .order("created_at");
  if (error) throw new Error(`Could not load volunteers: ${error.message}`);
  return data as Volunteer[];
}

export async function getSettings(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("settings")
    .select("email_intro,email_outro,signature,site_base_url,gmail_account")
    .eq("id", true)
    .single();
  if (error) throw new Error(`Could not load settings: ${error.message}`);
  return data as Settings;
}
