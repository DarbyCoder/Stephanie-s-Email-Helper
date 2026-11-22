import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/skeleton";
import { requireOrganizer } from "@/lib/auth";
import { getEvent, getVolunteers } from "@/lib/data";
import { formatTimestamp, shortDate, timeRange } from "@/lib/dates";
import { RosterTable } from "./roster-table";

export const metadata: Metadata = { title: "Roster" };

export default function RosterPage({ params }: PageProps<"/admin/events/[id]/roster">) {
  return (
    <Suspense fallback={<Skeleton lines={6} className="card p-6" />}>
      <Roster params={params} />
    </Suspense>
  );
}

async function Roster({ params }: { params: PageProps<"/admin/events/[id]/roster">["params"] }) {
  const { id } = await params;
  const supabase = await requireOrganizer();
  const event = await getEvent(supabase, id);
  if (!event) notFound();
  const volunteers = await getVolunteers(supabase, event.id);

  return (
    <>
      <PageHeader
        title={`Roster: ${event.name}`}
        subtitle={`${shortDate(event.date)} · ${timeRange(event)} · ${volunteers.length} of ${event.volunteers_needed} spots filled`}
        actions={
          <>
            <Link href={`/admin/events/${event.id}`} className="btn btn-secondary">
              Edit event
            </Link>
            <a href={`/e/${event.slug}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              Sign-up page
            </a>
          </>
        }
      />
      <RosterTable
        eventSlug={event.slug}
        volunteers={volunteers.map((v) => ({
          id: v.id,
          name: v.name,
          email: v.email,
          signedUp: formatTimestamp(v.created_at),
        }))}
      />
    </>
  );
}
