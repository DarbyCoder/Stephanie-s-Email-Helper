import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CopyButton } from "@/components/copy-button";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/skeleton";
import { requireOrganizer } from "@/lib/auth";
import { getEvent, getSettings } from "@/lib/data";
import { normalizeBaseUrl, requestOrigin } from "@/lib/origin";
import { EventForm } from "../event-form";
import { DeleteEventButton } from "./delete-event-button";

export const metadata: Metadata = { title: "Edit event" };

export default function EditEventPage({ params }: PageProps<"/admin/events/[id]">) {
  return (
    <div className="max-w-3xl">
      <Suspense fallback={<Skeleton lines={8} className="card p-6" />}>
        <EditEvent params={params} />
      </Suspense>
    </div>
  );
}

async function EditEvent({ params }: { params: PageProps<"/admin/events/[id]">["params"] }) {
  const { id } = await params;
  const supabase = await requireOrganizer();
  const [event, settings] = await Promise.all([getEvent(supabase, id), getSettings(supabase)]);
  if (!event) notFound();

  const publicUrl = `${normalizeBaseUrl(settings.site_base_url) || (await requestOrigin())}/e/${event.slug}`;

  return (
    <>
      <PageHeader
        title="Edit event"
        subtitle={event.name}
        actions={
          <Link href={`/admin/events/${event.id}/roster`} className="btn btn-secondary">
            Roster ({event.spots_filled}/{event.volunteers_needed})
          </Link>
        }
      />

      <div className="card mb-6 flex flex-wrap items-center gap-3 p-4 text-sm">
        <span className="font-medium text-slate-500">Sign-up link</span>
        <a href={`/e/${event.slug}`} target="_blank" rel="noopener noreferrer" className="link break-all">
          {publicUrl}
        </a>
        <CopyButton text={publicUrl} label="Copy link" className="btn btn-secondary ml-auto px-3 py-1" />
      </div>

      <EventForm event={event} />

      <section className="mt-10 rounded-xl border border-red-200 bg-white p-5 sm:p-6">
        <h2 className="font-semibold text-red-800">Delete event</h2>
        <p className="mt-1 text-sm text-slate-600">
          Removes the event, its sign-up page and all {event.spots_filled} sign-up
          {event.spots_filled === 1 ? "" : "s"}.
        </p>
        <div className="mt-4">
          <DeleteEventButton id={event.id} name={event.name} signups={event.spots_filled} />
        </div>
      </section>
    </>
  );
}
