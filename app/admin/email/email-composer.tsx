"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { CopyButton } from "@/components/copy-button";
import {
  buildBody,
  buildSubject,
  gmailComposeUrl,
  mailtoUrl,
  spotsRemaining,
  type EmailEvent,
  type EmailTemplate,
} from "@/lib/email";
import { markEventsSent } from "./actions";

type ComposerEvent = EmailEvent & { email_sent: boolean; when: string };

// Gmail starts rejecting compose links somewhere past this length.
const LONG_URL = 8000;

export function EmailComposer({
  events,
  template,
  baseUrl,
  usingFallbackBaseUrl,
  gmailAccount,
}: {
  events: ComposerEvent[];
  template: EmailTemplate;
  baseUrl: string;
  usingFallbackBaseUrl: boolean;
  gmailAccount: string;
}) {
  // Start with the events that still need people and haven't been announced.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(events.filter((e) => !e.email_sent && spotsRemaining(e) > 0).map((e) => e.id)),
  );
  // null = follow the generated text; a string = the organizer has edited it.
  const [editedSubject, setEditedSubject] = useState<string | null>(null);
  const [editedBody, setEditedBody] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [marking, startMarking] = useTransition();
  // Unique per instance: Next keeps recently visited pages mounted (hidden),
  // so a fixed id could point a label at the hidden copy of this form.
  const uid = useId();

  const chosen = events.filter((e) => selected.has(e.id));
  const subject = editedSubject ?? (chosen.length ? buildSubject(chosen) : "");
  const body = editedBody ?? (chosen.length ? buildBody(chosen, template, baseUrl) : "");
  const edited = editedSubject !== null || editedBody !== null;
  const ready = chosen.length > 0 && body.trim() !== "";
  const gmailUrl = gmailComposeUrl(subject, body, gmailAccount || undefined);

  function toggle(id: string) {
    setNotice(null);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function markSent() {
    startMarking(async () => {
      const result = await markEventsSent([...selected]);
      setNotice(
        result.error
          ? { kind: "error", text: result.error }
          : { kind: "ok", text: `Marked ${result.count} event${result.count === 1 ? "" : "s"} as sent.` },
      );
    });
  }

  if (events.length === 0) {
    return (
      <div className="card p-8 text-center text-slate-600">
        No upcoming events.{" "}
        <Link href="/admin/events/new" className="link">
          Create one
        </Link>{" "}
        first.
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <section className="card h-fit p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Upcoming events</h2>
        <ul className="space-y-1">
          {events.map((event) => {
            const remaining = spotsRemaining(event);
            const full = remaining === 0;
            return (
              <li key={event.id}>
                <label
                  className={`flex gap-3 rounded-lg p-2 ${full ? "opacity-60" : "cursor-pointer hover:bg-slate-50"}`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 size-4 shrink-0"
                    checked={selected.has(event.id)}
                    disabled={full && !selected.has(event.id)}
                    onChange={() => toggle(event.id)}
                  />
                  <span className="min-w-0 text-sm">
                    <span className="block font-medium text-slate-900">{event.name}</span>
                    <span className="block text-slate-500">{event.when}</span>
                    <span className="mt-0.5 flex flex-wrap gap-1.5 text-xs">
                      <span className={full ? "font-semibold text-slate-600" : "text-emerald-700"}>
                        {full ? "Full" : `${remaining} spot${remaining === 1 ? "" : "s"} left`}
                      </span>
                      {event.email_sent ? (
                        <span className="rounded bg-slate-100 px-1.5 text-slate-600">email sent</span>
                      ) : null}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card space-y-4 p-4 sm:p-6">
        {usingFallbackBaseUrl ? (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Sign-up links use this site&apos;s address ({baseUrl}). To change it, set the{" "}
            <Link href="/admin/settings" className="underline">
              site base URL
            </Link>
            .
          </p>
        ) : null}

        {edited ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-brand-50 p-3 text-sm text-brand-800">
            <span>You&apos;ve edited the text, so changing the selection won&apos;t update it.</span>
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => {
                setEditedSubject(null);
                setEditedBody(null);
              }}
            >
              Regenerate from selection
            </button>
          </div>
        ) : null}

        <div>
          <label htmlFor={`${uid}-subject`} className="label">
            Subject
          </label>
          <input
            id={`${uid}-subject`}
            className="input"
            value={subject}
            onChange={(e) => setEditedSubject(e.target.value)}
            placeholder="Select at least one event"
          />
        </div>

        <div>
          <label htmlFor={`${uid}-body`} className="label">
            Email text
          </label>
          <textarea
            id={`${uid}-body`}
            className="input min-h-[28rem] font-mono text-sm leading-relaxed"
            value={body}
            onChange={(e) => setEditedBody(e.target.value)}
            placeholder="Select at least one event"
            spellCheck
          />
        </div>

        {ready && gmailUrl.length > LONG_URL ? (
          <p className="text-sm text-amber-800">
            This email is long. If Gmail shows an error, use the copy buttons and paste it in instead.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {ready ? (
            <a href={gmailUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              Open in Gmail
            </a>
          ) : (
            <button type="button" className="btn btn-primary" disabled>
              Open in Gmail
            </button>
          )}
          <CopyButton text={ready ? subject : ""} label="Copy subject" />
          <CopyButton text={ready ? body : ""} label="Copy text" />
          {ready ? (
            <a href={mailtoUrl(subject, body)} className="px-2 text-sm text-slate-600 underline hover:text-slate-900">
              Or open in your mail app
            </a>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={selected.size === 0 || marking}
            onClick={markSent}
          >
            {marking ? "Saving…" : "Mark selected events as sent"}
          </button>
          {notice ? (
            <span
              className={`text-sm ${notice.kind === "ok" ? "text-emerald-700" : "text-red-700"}`}
              role="status"
            >
              {notice.text}
            </span>
          ) : null}
        </div>
      </section>
    </div>
  );
}
