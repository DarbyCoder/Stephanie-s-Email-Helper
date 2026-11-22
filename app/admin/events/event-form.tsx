"use client";

import Link from "next/link";
import {
  startTransition,
  useActionState,
  useId,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import type { GeocodeResult } from "@/lib/geocode";
import { mapUrl } from "@/lib/maps";
import type { EventRow, LocationType } from "@/lib/types";
import { lookupAddress, saveEvent, type EventFormState } from "./actions";

type Pin = { lat: number; lng: number; label?: string };

export function EventForm({ event }: { event?: EventRow }) {
  const [state, formAction, saving] = useActionState<EventFormState, FormData>(saveEvent, { error: null });

  const [locationType, setLocationType] = useState<LocationType>(event?.location_type ?? "specific");
  const [address, setAddress] = useState(event?.location_type === "specific" ? event.location_text : "");
  const [area, setArea] = useState(event?.location_type === "generic" ? event.location_text : "");
  const [pin, setPin] = useState<Pin | null>(
    event?.location_lat != null && event.location_lng != null
      ? { lat: event.location_lat, lng: event.location_lng }
      : null,
  );
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [lookingUp, startLookup] = useTransition();
  const [coolingDown, setCoolingDown] = useState(false);
  // Unique per instance: Next keeps recently visited pages mounted (hidden),
  // so a fixed id could point a label at the hidden copy of this form.
  const uid = useId();

  // Submit without React's automatic form reset, so a validation error keeps what was typed.
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  // Button-click only (no search-as-you-type), and at most one lookup per ~second.
  function handleLookup() {
    const query = address.trim();
    if (query.length < 3 || lookingUp || coolingDown) return;
    setLookupMessage(null);
    setResults([]);
    setCoolingDown(true);
    setTimeout(() => setCoolingDown(false), 1100);
    startLookup(async () => {
      const response = await lookupAddress(query);
      if ("error" in response) setLookupMessage(response.error);
      else if (response.results.length === 0) setLookupMessage("No matches. Try adding the city or ZIP code.");
      else setResults(response.results);
    });
  }

  function handleAddressKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault(); // Enter looks the address up instead of submitting the form
      handleLookup();
    }
  }

  const pinLink = pin
    ? mapUrl({ location_type: "specific", location_text: address, location_lat: pin.lat, location_lng: pin.lng })
    : null;

  return (
    <form onSubmit={handleSubmit} className="card space-y-6 p-5 sm:p-8">
      {event ? <input type="hidden" name="id" value={event.id} /> : null}
      <input type="hidden" name="location_type" value={locationType} />
      <input type="hidden" name="location_text" value={locationType === "specific" ? address : area} />
      <input type="hidden" name="location_lat" value={locationType === "specific" && pin ? pin.lat : ""} />
      <input type="hidden" name="location_lng" value={locationType === "specific" && pin ? pin.lng : ""} />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={`${uid}-name`} className="label">
            Event name
          </label>
          <input id={`${uid}-name`} name="name" className="input" required maxLength={200} defaultValue={event?.name} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${uid}-tagline`} className="label">
            Tagline
          </label>
          <input
            id={`${uid}-tagline`}
            name="tagline"
            className="input"
            maxLength={300}
            defaultValue={event?.tagline}
            placeholder="One line that makes people want to come"
          />
          <p className="hint">Shows after the name in the email: “FounderConnect: your tagline”.</p>
        </div>

        <div>
          <label htmlFor={`${uid}-date`} className="label">
            Date
          </label>
          <input id={`${uid}-date`} name="date" type="date" className="input" required defaultValue={event?.date} />
        </div>
        <div>
          <label htmlFor={`${uid}-volunteers_needed`} className="label">
            Volunteers needed
          </label>
          <input
            id={`${uid}-volunteers_needed`}
            name="volunteers_needed"
            type="number"
            inputMode="numeric"
            min={1}
            max={1000}
            step={1}
            className="input"
            required
            defaultValue={event?.volunteers_needed ?? 5}
          />
        </div>
        <div>
          <label htmlFor={`${uid}-start_time`} className="label">
            Start time
          </label>
          <input
            id={`${uid}-start_time`}
            name="start_time"
            type="time"
            step={60}
            className="input"
            required
            defaultValue={event?.start_time.slice(0, 5) ?? "18:00"}
          />
        </div>
        <div>
          <label htmlFor={`${uid}-end_time`} className="label">
            End time
          </label>
          <input
            id={`${uid}-end_time`}
            name="end_time"
            type="time"
            step={60}
            className="input"
            required
            defaultValue={event?.end_time.slice(0, 5) ?? "20:00"}
          />
        </div>
      </div>

      <fieldset>
        <legend className="label">Location</legend>
        <div className="inline-flex rounded-lg border border-slate-300 bg-slate-50 p-1" role="group">
          {(
            [
              ["specific", "Specific address"],
              ["generic", "General area"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={locationType === value}
              onClick={() => setLocationType(value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                locationType === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {locationType === "specific" ? (
          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor={`${uid}-address`} className="sr-only">
                Address
              </label>
              <div className="flex gap-2">
                <input
                  id={`${uid}-address`}
                  className="input"
                  required
                  maxLength={300}
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setPin(null); // the old pin no longer matches the text
                    setResults([]);
                  }}
                  onKeyDown={handleAddressKeyDown}
                  placeholder="CIC, 1 Broadway, Cambridge, MA 02142"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleLookup}
                  disabled={lookingUp || coolingDown || address.trim().length < 3}
                >
                  {lookingUp ? "Looking…" : "Look up"}
                </button>
              </div>
              <p className="hint">
                This text appears in the email as written. Look it up to pin it on a map.
              </p>
            </div>

            {lookupMessage ? <p className="text-sm text-amber-800">{lookupMessage}</p> : null}

            {results.length > 0 ? (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {results.map((result) => (
                  <li key={`${result.lat},${result.lng}`} className="flex items-center justify-between gap-3 p-3">
                    <span className="text-sm text-slate-700">{result.label}</span>
                    <button
                      type="button"
                      className="btn btn-secondary px-3 py-1"
                      onClick={() => {
                        setPin(result);
                        setResults([]);
                        setLookupMessage(null);
                      }}
                    >
                      Use this
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              {pin && pinLink ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium text-emerald-700">Map pin set</span>
                  {pin.label ? <span className="text-slate-600">{pin.label}</span> : null}
                  <a href={pinLink} target="_blank" rel="noopener noreferrer" className="link">
                    View map
                  </a>
                  <button type="button" className="text-slate-500 hover:text-slate-900" onClick={() => setPin(null)}>
                    Remove pin
                  </button>
                </div>
              ) : (
                <span className="text-slate-600">
                  No map pin yet. Without one, volunteers get a map link that searches the address text.
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Address search by Nominatim. Data ©{" "}
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">
                OpenStreetMap contributors
              </a>
              .
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <label htmlFor={`${uid}-area`} className="sr-only">
              General area
            </label>
            <input
              id={`${uid}-area`}
              className="input"
              required
              maxLength={300}
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="Downtown Crossing area"
            />
            <p className="hint">Free text, shown as written. No map link.</p>
          </div>
        )}
      </fieldset>

      {event ? (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="email_sent" defaultChecked={event.email_sent} className="size-4" />
          Call-for-volunteers email already sent
        </label>
      ) : null}

      {state.error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : event ? "Save changes" : "Create event"}
        </button>
        <Link href="/admin" className="btn btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}
