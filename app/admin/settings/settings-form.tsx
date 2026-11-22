"use client";

import { startTransition, useActionState, useId, type FormEvent } from "react";
import { EVENT_COUNT_PLACEHOLDER } from "@/lib/email";
import type { Settings } from "@/lib/types";
import { saveSettings, type SettingsState } from "./actions";

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, formAction, saving] = useActionState<SettingsState, FormData>(saveSettings, { status: "idle" });
  // Unique per instance: Next keeps recently visited pages mounted (hidden),
  // so a fixed id could point a label at the hidden copy of this form.
  const uid = useId();

  // Submit without React's automatic form reset, so an error keeps the edits.
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-6 p-5 sm:p-8">
      <div>
        <label htmlFor={`${uid}-email_intro`} className="label">
          Email intro
        </label>
        <textarea
          id={`${uid}-email_intro`}
          name="email_intro"
          rows={6}
          className="input"
          defaultValue={settings.email_intro}
        />
        <p className="hint">
          Comes before the event list. Write <code className="rounded bg-slate-100 px-1">{EVENT_COUNT_PLACEHOLDER}</code>{" "}
          where you want “THREE events” (or “ONE event”), matched to how many you select.
        </p>
      </div>

      <div>
        <label htmlFor={`${uid}-email_outro`} className="label">
          Email outro
        </label>
        <textarea
          id={`${uid}-email_outro`}
          name="email_outro"
          rows={7}
          className="input"
          defaultValue={settings.email_outro}
        />
        <p className="hint">Comes after the event list, e.g. “As a volunteer, you&apos;ll:” and a few bullets.</p>
      </div>

      <div>
        <label htmlFor={`${uid}-signature`} className="label">
          Signature
        </label>
        <textarea id={`${uid}-signature`} name="signature" rows={3} className="input" defaultValue={settings.signature} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-site_base_url`} className="label">
            Site base URL
          </label>
          <input
            id={`${uid}-site_base_url`}
            name="site_base_url"
            type="url"
            className="input"
            placeholder="https://volunteer-hub.vercel.app"
            defaultValue={settings.site_base_url}
          />
          <p className="hint">Start of every sign-up link in the email. Leave blank to use this site&apos;s address.</p>
        </div>
        <div>
          <label htmlFor={`${uid}-gmail_account`} className="label">
            Gmail account (optional)
          </label>
          <input
            id={`${uid}-gmail_account`}
            name="gmail_account"
            type="email"
            className="input"
            placeholder="you@startupboston.org"
            defaultValue={settings.gmail_account}
          />
          <p className="hint">“Open in Gmail” uses this account when you&apos;re signed in to more than one.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </button>
        {state.status === "saved" && !saving ? (
          <span className="text-sm font-medium text-emerald-700" role="status">
            Saved
          </span>
        ) : null}
        {state.status === "error" ? (
          <span className="text-sm font-medium text-red-700" role="alert">
            {state.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
