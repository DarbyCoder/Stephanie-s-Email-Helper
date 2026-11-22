"use client";

import { useActionState, useId } from "react";
import { signUp, type SignupState } from "./actions";

const initialState: SignupState = { status: "idle" };

export function SignupForm({ eventId, slug, full }: { eventId: string; slug: string; full: boolean }) {
  const [state, formAction, pending] = useActionState(signUp, initialState);
  // Unique per instance: Next keeps recently visited pages mounted (hidden),
  // so a fixed id could point a label at the hidden copy of this form.
  const uid = useId();
  const isFull = full || state.status === "full";
  const closed = state.status === "closed";

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "success" ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900" role="status">
          <p className="font-semibold">You&apos;re signed up{state.name ? `, ${state.name.split(" ")[0]}` : ""}!</p>
          <p className="text-sm">
            Thanks for volunteering. We&apos;ll see you there.
            {state.emailed ? ` A confirmation email is on its way to ${state.email}.` : ""}
          </p>
        </div>
      ) : null}

      {state.status === "duplicate" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900" role="status">
          <p className="font-semibold">You&apos;re already on the list!</p>
          <p className="text-sm">
            {state.email} is already signed up for this event. No need to do anything else. See you there!
          </p>
        </div>
      ) : null}

      {isFull ? (
        <p className="rounded-lg bg-slate-200/70 p-4 font-semibold text-slate-800" role="status">
          This event is full. Thank you for your interest!
        </p>
      ) : null}

      {closed ? (
        <p className="rounded-lg bg-slate-200/70 p-4 font-semibold text-slate-800" role="status">
          Sign-ups for this event are closed.
        </p>
      ) : null}

      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="slug" value={slug} />

      {/* Honeypot: invisible to people (and screen readers), tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <fieldset disabled={isFull || closed || pending} className="space-y-4">
        <div>
          <label htmlFor={`${uid}-name`} className="label">
            Your name
          </label>
          <input
            id={`${uid}-name`}
            name="name"
            className="input"
            required
            maxLength={100}
            autoComplete="name"
            defaultValue={state.values?.name}
          />
        </div>
        <div>
          <label htmlFor={`${uid}-email`} className="label">
            Email
          </label>
          <input
            id={`${uid}-email`}
            name="email"
            type="email"
            className="input"
            required
            maxLength={254}
            autoComplete="email"
            inputMode="email"
            defaultValue={state.values?.email}
          />
        </div>

        {state.status === "error" ? (
          <p className="text-sm font-medium text-red-700" role="alert">
            {state.message}
          </p>
        ) : null}

        <button type="submit" className="btn btn-primary w-full py-3 text-base sm:w-auto sm:px-8">
          {pending ? "Signing you up…" : "Sign me up"}
        </button>
      </fieldset>
    </form>
  );
}
