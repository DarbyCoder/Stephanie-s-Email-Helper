export type LocationType = "specific" | "generic";

/** Event columns the public may read (see the column grants in the migration). */
export interface PublicEvent {
  id: string;
  name: string;
  tagline: string;
  date: string; // YYYY-MM-DD, Boston local
  start_time: string; // HH:MM:SS, Boston local
  end_time: string; // HH:MM:SS, Boston local
  location_type: LocationType;
  location_text: string;
  location_lat: number | null;
  location_lng: number | null;
  volunteers_needed: number;
  slug: string;
}

export interface EventRow extends PublicEvent {
  email_sent: boolean;
  created_at: string;
}

export type WithSpots<T> = T & { spots_filled: number };

export interface Volunteer {
  id: string;
  event_id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface Settings {
  email_intro: string;
  email_outro: string;
  signature: string;
  site_base_url: string;
  gmail_account: string;
}
