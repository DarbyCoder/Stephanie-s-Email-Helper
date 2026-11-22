// Address lookup via OpenStreetMap Nominatim, following its usage policy
// (https://operations.osmfoundation.org/policies/nominatim/):
//   * identify the app with a custom User-Agent (browsers can't set one, so
//     lookups run on the server),
//   * at most 1 request per second (requests are queued and spaced out),
//   * cache results, and only search on an explicit button click.

export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}

const ENDPOINT = "https://nominatim.openstreetmap.org/search";
const MIN_INTERVAL_MS = 1100;
const MAX_CACHE_ENTRIES = 200;

const cache = new Map<string, GeocodeResult[]>();
let queue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

function userAgent(siteUrl?: string) {
  if (process.env.NOMINATIM_USER_AGENT) return process.env.NOMINATIM_USER_AGENT;
  return `StartupBoston-VolunteerHub/1.0${siteUrl ? ` (+${siteUrl})` : ""}`;
}

async function request(query: string, siteUrl?: string): Promise<GeocodeResult[]> {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();

  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "5",
    countrycodes: "us",
    viewbox: "-71.25,42.45,-70.95,42.22", // prefer Greater Boston without excluding elsewhere
  });
  const response = await fetch(`${ENDPOINT}?${params}`, {
    headers: { "User-Agent": userAgent(siteUrl), "Accept-Language": "en" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Nominatim responded with ${response.status}`);

  const rows = (await response.json()) as { display_name: string; lat: string; lon: string }[];
  return rows.map((row) => ({ label: row.display_name, lat: Number(row.lat), lng: Number(row.lon) }));
}

export async function geocode(query: string, siteUrl?: string) {
  const key = query.trim().replace(/\s+/g, " ").toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  // Chain onto the queue so requests from this server never overlap.
  const pending = queue.then(() => request(query.trim(), siteUrl));
  queue = pending.catch(() => undefined);
  const results = await pending;

  if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value!);
  cache.set(key, results);
  return results;
}
