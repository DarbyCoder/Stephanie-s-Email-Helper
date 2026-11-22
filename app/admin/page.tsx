import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/skeleton";
import { requireOrganizer } from "@/lib/auth";
import { getAllEvents } from "@/lib/data";
import { hasEnded, nowInBoston, shortDate, timeRange } from "@/lib/dates";
import type { EventRow, WithSpots } from "@/lib/types";

export const metadata: Metadata = { title: "Events" };

export default function EventsPage() {
  return (
    <>
      <PageHeader
        title="Events"
        actions={
          <Link href="/admin/events/new" className="btn btn-primary">
            New event
          </Link>
        }
      />
      <Suspense fallback={<Skeleton lines={5} className="card p-6" />}>
        <EventLists />
      </Suspense>
    </>
  );
}

async function EventLists() {
  const supabase = await requireOrganizer();
  const events = await getAllEvents(supabase); // soonest first
  const now = nowInBoston();
  const upcoming = events.filter((event) => !hasEnded(event, now));
  const past = events.filter((event) => hasEnded(event, now)).reverse(); // most recent first

  return (
    <>
      {upcoming.length > 0 ? (
        <EventTable events={upcoming} />
      ) : (
        <div className="card p-8 text-center text-slate-600">
          No upcoming events.{" "}
          <Link href="/admin/events/new" className="link">
            Create one
          </Link>
          .
        </div>
      )}

      {past.length > 0 ? (
        <details className="mt-10">
          <summary className="text-sm font-semibold text-slate-700">Past ({past.length})</summary>
          <div className="mt-4">
            <EventTable events={past} />
          </div>
        </details>
      ) : null}
    </>
  );
}

function EventTable({ events }: { events: WithSpots<EventRow>[] }) {
  return (
    <div className="card relative overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          <tr>
            <th className="px-4 py-3">Date/time</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3">Volunteers</th>
            <th className="px-4 py-3">Email sent</th>
            <th className="px-4 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {events.map((event) => {
            const full = event.spots_filled >= event.volunteers_needed;
            return (
              <tr key={event.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="font-medium">{shortDate(event.date)}</div>
                  <div className="text-slate-500">{timeRange(event)}</div>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/events/${event.id}`} className="font-medium text-slate-900 hover:underline">
                    {event.name}
                  </Link>
                </td>
                <td className="max-w-[16rem] px-4 py-3 text-slate-600">
                  <span className="line-clamp-2">{event.location_text}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Link href={`/admin/events/${event.id}/roster`} className="hover:underline">
                    <span className={full ? "font-semibold text-emerald-700" : "font-medium"}>
                      {event.spots_filled}/{event.volunteers_needed}
                    </span>
                    {full ? <span className="ml-1 text-xs text-emerald-700">full</span> : null}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                      event.email_sent ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {event.email_sent ? "Y" : "N"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Link href={`/admin/events/${event.id}`} className="link">
                    Edit
                  </Link>
                  <span className="mx-2 text-slate-300">|</span>
                  <Link href={`/admin/events/${event.id}/roster`} className="link">
                    Roster
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
