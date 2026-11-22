import { dayOfMonth, monthAbbr } from "@/lib/dates";

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function slugify(text: string) {
  const slug = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return slug || "event";
}

/** "FounderConnect" on 2026-11-28 -> "founderconnect-nov-28". Generated once, never changed. */
export function eventSlug(name: string, date: string) {
  return `${slugify(name)}-${monthAbbr(date).toLowerCase()}-${dayOfMonth(date)}`;
}
