// All event dates and times are Boston local time. Every weekday, "today" and
// "has it ended?" calculation goes through America/New_York explicitly, so the
// server's own time zone (UTC on Vercel) never matters.

export const TIME_ZONE = "America/New_York";

const nowParts = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Current Boston date ("YYYY-MM-DD") and time ("HH:MM:SS"). */
export function nowInBoston(now: Date = new Date()) {
  const p = Object.fromEntries(nowParts.formatToParts(now).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}:${p.second}` };
}

function hms(time: string) {
  return time.length === 5 ? `${time}:00` : time.slice(0, 8);
}

/** True once the event's end time has passed in Boston. */
export function hasEnded(
  event: { date: string; end_time: string },
  now = nowInBoston(),
) {
  return `${event.date}T${hms(event.end_time)}` <= `${now.date}T${now.time}`;
}

// A calendar date at noon UTC is the same calendar day in Boston (7 or 8 AM),
// so formatting it in America/New_York always yields the right weekday.
function calendarDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

const weekdayLong = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "long" });
const weekdayShort = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "short" });
const monthShort = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, month: "short" });

/** "Saturday" */
export function weekday(date: string) {
  return weekdayLong.format(calendarDate(date));
}

/** "Nov" */
export function monthAbbr(date: string) {
  return monthShort.format(calendarDate(date));
}

/** 28 */
export function dayOfMonth(date: string) {
  return Number(date.slice(8, 10));
}

/** "Nov 28" */
export function monthDay(date: string) {
  return `${monthAbbr(date)} ${dayOfMonth(date)}`;
}

/** "Sat, Nov 28" */
export function shortDate(date: string) {
  return `${weekdayShort.format(calendarDate(date))}, ${monthDay(date)}`;
}

/** "18:30:00" -> "6:30 PM". Built by hand so plain-text emails get a normal space. */
export function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "6:00 PM – 8:30 PM" */
export function timeRange(event: { start_time: string; end_time: string }) {
  return `${formatTime(event.start_time)} – ${formatTime(event.end_time)}`;
}

const timestampFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** Supabase timestamptz -> "Nov 21, 9:42 PM" (Boston). */
export function formatTimestamp(iso: string) {
  return timestampFormat.format(new Date(iso));
}
