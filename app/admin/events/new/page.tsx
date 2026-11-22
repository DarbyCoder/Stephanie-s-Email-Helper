import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { EventForm } from "../event-form";

export const metadata: Metadata = { title: "New event" };

export default function NewEventPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="New event" />
      <EventForm />
    </div>
  );
}
