"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireOrganizer } from "@/lib/auth";
import { geocode, type GeocodeResult } from "@/lib/geocode";
import { normalizeBaseUrl, requestOrigin } from "@/lib/origin";
import { eventSlug } from "@/lib/slug";
import type { LocationType } from "@/lib/types";
import { field, isUuid, isValidDate, isValidTime } from "@/lib/validation";

export type EventFormState = { error: string | null };

type EventValues = {
  name: string;
  tagline: string;
  date: string;
  start_time: string;
  end_time: string;
  volunteers_needed: number;
  location_type: LocationType;
  location_text: string;
  location_lat: number | null;
  location_lng: number | null;
};

function parseEventForm(formData: FormData): { values: EventValues } | { error: string } {
  const name = field(formData, "name");
  const tagline = field(formData, "tagline");
  const date = field(formData, "date");
  const start = field(formData, "start_time");
  const end = field(formData, "end_time");
  const needed = Number(field(formData, "volunteers_needed"));
  const locationType: LocationType = field(formData, "location_type") === "generic" ? "generic" : "specific";
  const locationText = field(formData, "location_text");

  if (!name) return { error: "Give the event a name." };
  if (name.length > 200) return { error: "The name can be at most 200 characters." };
  if (tagline.length > 300) return { error: "The tagline can be at most 300 characters." };
  if (!isValidDate(date)) return { error: "Pick a valid date." };
  if (!isValidTime(start) || !isValidTime(end)) return { error: "Set a start and an end time." };
  if (end.slice(0, 5) <= start.slice(0, 5)) return { error: "The end time must be after the start time." };
  if (!Number.isInteger(needed) || needed < 1 || needed > 1000) {
    return { error: "Volunteers needed must be a whole number from 1 to 1000." };
  }
  if (!locationText) {
    return { error: locationType === "specific" ? "Enter the address." : "Describe the general area." };
  }
  if (locationText.length > 300) return { error: "The location can be at most 300 characters." };

  let lat: number | null = null;
  let lng: number | null = null;
  if (locationType === "specific") {
    const rawLat = field(formData, "location_lat");
    const rawLng = field(formData, "location_lng");
    const parsedLat = Number(rawLat);
    const parsedLng = Number(rawLng);
    if (rawLat && rawLng && Math.abs(parsedLat) <= 90 && Math.abs(parsedLng) <= 180) {
      lat = parsedLat;
      lng = parsedLng;
    }
  }

  return {
    values: {
      name,
      tagline,
      date,
      start_time: start,
      end_time: end,
      volunteers_needed: needed,
      location_type: locationType,
      location_text: locationText,
      location_lat: lat,
      location_lng: lng,
    },
  };
}

/** Slug is created once ("founderconnect-nov-28", then "-2", "-3"... if taken) and never changes. */
async function insertEvent(supabase: SupabaseClient, values: EventValues) {
  const base = eventSlug(values.name, values.date);
  for (let attempt = 1; attempt <= 25; attempt++) {
    const slug = attempt === 1 ? base : `${base}-${attempt}`;
    const { error } = await supabase.from("events").insert({ ...values, slug });
    if (!error) return null;
    if (error.code !== "23505") return `Could not save the event: ${error.message}`;
  }
  return "Could not create a unique link for this event. Try a slightly different name.";
}

export async function saveEvent(_prev: EventFormState, formData: FormData): Promise<EventFormState> {
  const supabase = await requireOrganizer();
  const parsed = parseEventForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const id = field(formData, "id");
  if (id) {
    if (!isUuid(id)) return { error: "Unknown event." };
    const { error } = await supabase
      .from("events")
      .update({ ...parsed.values, email_sent: formData.get("email_sent") === "on" })
      .eq("id", id);
    if (error) return { error: `Could not save the event: ${error.message}` };
  } else {
    const error = await insertEvent(supabase, parsed.values);
    if (error) return { error };
  }

  revalidatePath("/admin", "layout");
  redirect("/admin");
}

export async function deleteEvent(id: string) {
  const supabase = await requireOrganizer();
  if (!isUuid(id)) return { error: "Unknown event." };
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return { error: `Could not delete the event: ${error.message}` };
  revalidatePath("/admin", "layout");
  redirect("/admin");
}

export async function lookupAddress(
  query: string,
): Promise<{ results: GeocodeResult[] } | { error: string }> {
  const supabase = await requireOrganizer(); // only the organizer can use our Nominatim proxy
  const q = query.trim();
  if (q.length < 3) return { error: "Type a bit more of the address first." };
  if (q.length > 300) return { error: "That address is too long." };

  const { data: settings } = await supabase.from("settings").select("site_base_url").eq("id", true).maybeSingle();
  const siteUrl = normalizeBaseUrl(settings?.site_base_url ?? "") || (await requestOrigin());

  try {
    return { results: await geocode(q, siteUrl) };
  } catch (error) {
    console.error("Address lookup failed:", error);
    return {
      error:
        "Address lookup isn't available right now. You can still save; volunteers will get a map link that searches the address.",
    };
  }
}

export async function removeVolunteer(volunteerId: string) {
  const supabase = await requireOrganizer();
  if (!isUuid(volunteerId)) return { error: "Unknown volunteer." };
  const { error } = await supabase.from("volunteers").delete().eq("id", volunteerId);
  if (error) return { error: `Could not remove the volunteer: ${error.message}` };
  revalidatePath("/admin", "layout");
  return { error: null };
}
