import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

export default function NotFound() {
  return (
    <PublicShell>
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">We couldn&apos;t find that page</h1>
        <p className="mt-2 text-slate-600">
          If you followed a sign-up link, the event may have been removed or the link may be incomplete.
        </p>
        <Link href="/" className="btn btn-secondary mt-6">
          See upcoming events
        </Link>
      </div>
    </PublicShell>
  );
}
