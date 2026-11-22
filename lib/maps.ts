/** Google Maps link: exact pin when we have coordinates, otherwise an address search. */
export function mapUrl(event: {
  location_type: string;
  location_text: string;
  location_lat: number | null;
  location_lng: number | null;
}) {
  const query =
    event.location_lat !== null && event.location_lng !== null
      ? `${event.location_lat},${event.location_lng}`
      : event.location_text;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
