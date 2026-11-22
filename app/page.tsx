import Link from "next/link";
import { Suspense } from "react";
import { PublicShell } from "@/components/public-shell";
import { Skeleton } from "@/components/skeleton";
import { getUpcomingPublicEvents } from "@/lib/data";
import { shortDate, timeRange } from "@/lib/dates";

export default function HomePage() {
  return (
    <PublicShell>
      <h1 className="text-3xl font-semibold tracking-tight">Volunteer with Startup Boston</h1>
      <p className="mt-2 text-slate-600">
        Help run events for Boston&apos;s startup community. Pick an event and grab a spot.
      </p>
      <div className="mt-8">
        <Suspense fallback={<Skeleton lines={4} />}>
          <UpcomingEvents />
        </Suspense>
      </div>
    </PublicShell>
  );
}

async function UpcomingEvents() {
  const events = await getUpcomingPublicEvents();

  if (events.length === 0) {
    return (
      <p className="card p-6 text-slate-600">No upcoming events need volunteers right now. Check back soon!</p>
    );
  }

  return (
    <ul className="space-y-4">
      {events.map((event) => {
        const left = event.volunteers_needed - event.spots_filled;
        return (
          <li key={event.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">{event.name}</h2>
                {event.tagline ? <p className="text-slate-600">{event.tagline}</p> : null}
                <p className="mt-2 text-sm text-slate-700">
                  {shortDate(event.date)} · {timeRange(event)}
                </p>
                <p className="text-sm text-slate-700">{event.location_text}</p>
              </div>
              {left > 0 ? (
                <Link href={`/e/${event.slug}`} className="btn btn-primary">
                  Sign up · {left} left
                </Link>
              ) : (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                  Full, thank you!
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
