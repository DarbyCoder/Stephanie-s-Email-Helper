import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PublicShell } from "@/components/public-shell";
import { Skeleton } from "@/components/skeleton";
import { Spots } from "@/components/spots";
import { getPublicEvent } from "@/lib/data";
import { hasEnded, monthDay, timeRange, weekday } from "@/lib/dates";
import { mapUrl } from "@/lib/maps";
import { SignupForm } from "./signup-form";

export async function generateMetadata({ params }: PageProps<"/e/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublicEvent(slug);
  if (!event) return { title: "Event not found" };
  const description = `${weekday(event.date)}, ${monthDay(event.date)} · ${timeRange(event)} · ${event.location_text}`;
  return {
    title: `Volunteer: ${event.name}`,
    description,
    openGraph: { title: `Volunteer at ${event.name}`, description },
  };
}

export default function EventSignupPage({ params }: PageProps<"/e/[slug]">) {
  return (
    <PublicShell>
      <Suspense fallback={<Skeleton lines={6} className="card p-6" />}>
        <EventSignup params={params} />
      </Suspense>
    </PublicShell>
  );
}

async function EventSignup({ params }: { params: PageProps<"/e/[slug]">["params"] }) {
  const { slug } = await params;
  const event = await getPublicEvent(slug);
  if (!event) notFound();

  const ended = hasEnded(event);
  const full = event.spots_filled >= event.volunteers_needed;

  return (
    <article className="card overflow-hidden">
      <div className="p-5 sm:p-8">
        <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">Volunteer sign-up</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{event.name}</h1>
        {event.tagline ? <p className="mt-2 text-slate-600">{event.tagline}</p> : null}

        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-slate-500">When</dt>
            <dd className="mt-0.5 text-slate-900">
              {weekday(event.date)}, {monthDay(event.date)}
              <br />
              {timeRange(event)}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Where</dt>
            <dd className="mt-0.5 text-slate-900">
              {event.location_text}
              {event.location_type === "specific" ? (
                <>
                  <br />
                  <a href={mapUrl(event)} target="_blank" rel="noopener noreferrer" className="link">
                    Open in Maps
                  </a>
                </>
              ) : null}
            </dd>
          </div>
        </dl>

        <div className="mt-6">
          <Spots filled={event.spots_filled} needed={event.volunteers_needed} />
        </div>
      </div>

      <div className="border-t border-slate-200 bg-slate-50 p-5 sm:p-8">
        {ended ? (
          <p className="text-slate-700">This event has already happened. Thanks for your interest!</p>
        ) : (
          <SignupForm eventId={event.id} full={full} />
        )}
      </div>
    </article>
  );
}
