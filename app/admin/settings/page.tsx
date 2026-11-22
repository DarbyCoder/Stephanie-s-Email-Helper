import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/skeleton";
import { requireOrganizer } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" subtitle="Set once; used for every call-for-volunteers email." />
      <Suspense fallback={<Skeleton lines={8} className="card p-6" />}>
        <SettingsLoader />
      </Suspense>
    </div>
  );
}

async function SettingsLoader() {
  const supabase = await requireOrganizer();
  const settings = await getSettings(supabase);
  return <SettingsForm settings={settings} />;
}
