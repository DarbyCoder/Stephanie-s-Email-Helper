import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/skeleton";
import { requireOrganizer } from "@/lib/auth";
import { getAllEvents, getSettings } from "@/lib/data";
import { hasEnded, nowInBoston, shortDate, timeRange } from "@/lib/dates";
import { normalizeBaseUrl, requestOrigin } from "@/lib/origin";
import { EmailComposer } from "./email-composer";

export const metadata: Metadata = { title: "Email" };

export default function EmailPage() {
  return (
    <>
      <PageHeader
        title="Call for volunteers"
        subtitle="Pick the events, check the text, then open it in Gmail. Recipients are left blank."
      />
      <Suspense fallback={<Skeleton lines={8} className="card p-6" />}>
        <Composer />
      </Suspense>
    </>
  );
}

async function Composer() {
  const supabase = await requireOrganizer();
  const [events, settings] = await Promise.all([getAllEvents(supabase), getSettings(supabase)]);
  const now = nowInBoston();
  const configuredBaseUrl = normalizeBaseUrl(settings.site_base_url);

  return (
    <EmailComposer
      events={events
        .filter((event) => !hasEnded(event, now))
        .map((event) => ({
          id: event.id,
          name: event.name,
          tagline: event.tagline,
          date: event.date,
          start_time: event.start_time,
          end_time: event.end_time,
          location_text: event.location_text,
          slug: event.slug,
          volunteers_needed: event.volunteers_needed,
          spots_filled: event.spots_filled,
          email_sent: event.email_sent,
          when: `${shortDate(event.date)} · ${timeRange(event)}`,
        }))}
      template={{
        email_intro: settings.email_intro,
        email_outro: settings.email_outro,
        signature: settings.signature,
      }}
      baseUrl={configuredBaseUrl || (await requestOrigin())}
      usingFallbackBaseUrl={!configuredBaseUrl}
      gmailAccount={settings.gmail_account}
    />
  );
}
