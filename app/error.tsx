"use client";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-slate-600">We couldn&apos;t load this page. Please try again in a moment.</p>
        {digest ? <p className="mt-2 text-xs text-slate-400">Reference: {digest}</p> : null}
        <button type="button" className="btn btn-primary mt-6" onClick={() => retry()}>
          Try again
        </button>
      </div>
    </main>
  );
}
