// Builds the plain-text "call for volunteers" email. Pure functions: the email
// page uses them in the browser for the live preview.

import { dayOfMonth, formatTime, monthAbbr, monthDay, weekday } from "@/lib/dates";
import type { PublicEvent, Settings, WithSpots } from "@/lib/types";

export type EmailEvent = WithSpots<
  Pick<
    PublicEvent,
    "id" | "name" | "tagline" | "date" | "start_time" | "end_time" | "location_text" | "slug" | "volunteers_needed"
  >
>;

export type EmailTemplate = Pick<Settings, "email_intro" | "email_outro" | "signature">;

export const EVENT_COUNT_PLACEHOLDER = "{{event_count}}";

const NUMBER_WORDS = ["ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN"];

/** 3 -> "THREE events", 1 -> "ONE event" */
export function eventCountPhrase(count: number) {
  return `${NUMBER_WORDS[count] ?? count} event${count === 1 ? "" : "s"}`;
}

export function spotsRemaining(event: Pick<EmailEvent, "volunteers_needed" | "spots_filled">) {
  return Math.max(0, event.volunteers_needed - event.spots_filled);
}

function byDateTime(a: EmailEvent, b: EmailEvent) {
  return `${a.date}T${a.start_time}`.localeCompare(`${b.date}T${b.start_time}`);
}

/** "Call For Volunteers: Nov 17, 18, 19" (month repeats only when it changes). */
export function buildSubject(events: EmailEvent[]) {
  const dates = [...new Set([...events].sort(byDateTime).map((e) => e.date))];
  let lastMonth = "";
  const parts = dates.map((date) => {
    const month = monthAbbr(date);
    const part = month === lastMonth ? String(dayOfMonth(date)) : `${month} ${dayOfMonth(date)}`;
    lastMonth = month;
    return part;
  });
  return `Call For Volunteers: ${parts.join(", ")}`;
}

function eventBlock(event: EmailEvent, index: number, baseUrl: string) {
  const remaining = spotsRemaining(event);
  return [
    `Event #${index + 1}: (we need ${remaining} ${remaining === 1 ? "person" : "people"} for this one!)`,
    event.tagline.trim() ? `${event.name}: ${event.tagline.trim()}` : event.name,
    `Date/Time: ${weekday(event.date)}, ${monthDay(event.date)} from ${formatTime(event.start_time)} - ${formatTime(event.end_time)}`,
    `Location: ${event.location_text}`,
    `Sign up: ${baseUrl}/e/${event.slug}`,
  ].join("\n");
}

export function buildBody(events: EmailEvent[], template: EmailTemplate, baseUrl: string) {
  const sorted = [...events].sort(byDateTime);
  const fill = (text: string) =>
    text.replace(/\{\{\s*event_count\s*\}\}/gi, eventCountPhrase(sorted.length)).trim();

  return [
    fill(template.email_intro),
    ...sorted.map((event, i) => eventBlock(event, i, baseUrl)),
    fill(template.email_outro),
    fill(template.signature),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function gmailComposeUrl(subject: string, body: string, account?: string) {
  const params = [
    "view=cm",
    "fs=1",
    account ? `authuser=${encodeURIComponent(account)}` : "",
    `su=${encodeURIComponent(subject)}`,
    `body=${encodeURIComponent(body)}`,
  ].filter(Boolean);
  return `https://mail.google.com/mail/?${params.join("&")}`;
}

export function mailtoUrl(subject: string, body: string) {
  // RFC 6068 wants CRLF line breaks in mailto bodies.
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.replace(/\r?\n/g, "\r\n"))}`;
}
