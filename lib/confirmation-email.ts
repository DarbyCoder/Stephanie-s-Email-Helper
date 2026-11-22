// Sends the volunteer a plain-text confirmation through Resend's HTTP API.
// Optional: does nothing unless RESEND_API_KEY and EMAIL_FROM are set.

import { createPublicClient } from "@/lib/supabase/server";
import { PUBLIC_EVENT_COLUMNS } from "@/lib/data";
import { monthDay, timeRange, weekday } from "@/lib/dates";
import { mapUrl } from "@/lib/maps";
import type { PublicEvent } from "@/lib/types";

export function confirmationEmailsEnabled() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendConfirmationEmail(opts: {
  eventId: string;
  name: string;
  email: string;
  signupUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return;

  const { data, error } = await createPublicClient()
    .from("events")
    .select(PUBLIC_EVENT_COLUMNS)
    .eq("id", opts.eventId)
    .maybeSingle();
  if (error || !data) {
    console.error("Confirmation email: could not load event", error);
    return;
  }
  const event = data as PublicEvent;
  const firstName = opts.name.split(" ")[0];

  const text = [
    `Hi ${firstName},`,
    "",
    `You're signed up to volunteer at ${event.name}. Thank you!`,
    "",
    `When: ${weekday(event.date)}, ${monthDay(event.date)}, ${timeRange(event)}`,
    `Where: ${event.location_text}`,
    ...(event.location_type === "specific" ? [`Map: ${mapUrl(event)}`] : []),
    `Event page: ${opts.signupUrl}`,
    "",
    "Can't make it anymore? Just reply to this email and let us know.",
    "",
    "See you there!",
    "Startup Boston",
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [opts.email],
      subject: `You're signed up: ${event.name} (${monthDay(event.date)})`,
      text,
      ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    console.error("Confirmation email failed:", response.status, await response.text());
  }
}
