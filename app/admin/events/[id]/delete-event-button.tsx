"use client";

import { useId, useState, useTransition } from "react";
import { deleteEvent } from "../actions";

export function DeleteEventButton({ id, name, signups }: { id: string; name: string; signups: number }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Unique per instance: Next keeps recently visited pages mounted (hidden),
  // so a fixed id could point a label at the hidden copy of this form.
  const uid = useId();

  if (!confirming) {
    return (
      <button type="button" className="btn btn-quiet-danger border border-red-200" onClick={() => setConfirming(true)}>
        Delete event…
      </button>
    );
  }

  return (
    <div role="alertdialog" aria-labelledby={`${uid}-delete-confirm`} className="rounded-lg bg-red-50 p-4">
      <p id={`${uid}-delete-confirm`} className="text-sm font-medium text-red-900">
        Delete “{name}”{signups > 0 ? ` and its ${signups} sign-up${signups === 1 ? "" : "s"}` : ""}? This can&apos;t
        be undone.
      </p>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="btn btn-danger"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteEvent(id); // redirects on success
              if (result?.error) setError(result.error);
            })
          }
        >
          {pending ? "Deleting…" : "Yes, delete it"}
        </button>
        <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => setConfirming(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
