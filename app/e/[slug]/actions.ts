"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { confirmationEmailsEnabled, sendConfirmationEmail } from "@/lib/confirmation-email";
import { normalizeBaseUrl, requestOrigin } from "@/lib/origin";
import { createPublicClient } from "@/lib/supabase/server";
import { field, isUuid, isValidEmail } from "@/lib/validation";

export type SignupState = {
  status: "idle" | "success" | "duplicate" | "full" | "closed" | "error";
  message?: string;
  name?: string;
  email?: string;
  /** True when a confirmation email is being sent. */
  emailed?: boolean;
  /** What the person typed, so the form keeps it after an error. */
  values?: { name: string; email: string };
};

const EMPTY = { name: "", email: "" };

export async function signUp(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const eventId = field(formData, "event_id");
  const name = field(formData, "name").replace(/\s+/g, " ");
  const email = field(formData, "email").toLowerCase();
  const values = { name, email };

  // Honeypot: hidden from people, so only bots fill it. Pretend it worked.
  if (field(formData, "website")) return { status: "success", name, values: EMPTY };

  if (!isUuid(eventId)) {
    return { status: "error", message: "Something went wrong. Please reload the page and try again.", values };
  }
  if (!name || name.length > 100) {
    return { status: "error", message: "Please enter your name (up to 100 characters).", values };
  }
  if (!isValidEmail(email)) {
    return { status: "error", message: "Please enter a valid email address.", values };
  }

  // Capacity and duplicates are enforced by a trigger in Postgres, atomically.
  const { error } = await createPublicClient().from("volunteers").insert({ event_id: eventId, name, email });

  if (!error) {
    refresh(); // update "X of Y spots filled"
    const emailed = confirmationEmailsEnabled();
    if (emailed) {
      const slug = field(formData, "slug");
      const signupUrl = `${normalizeBaseUrl(process.env.SITE_URL ?? "") || (await requestOrigin())}/e/${slug}`;
      // Sent after the response: a slow or failing email never affects the sign-up.
      after(() => sendConfirmationEmail({ eventId, name, email, signupUrl }).catch((e) => console.error(e)));
    }
    return { status: "success", name, email, emailed, values: EMPTY };
  }
  if (error.code === "23505") return { status: "duplicate", email, values };
  if (error.message === "event_full") {
    refresh();
    return { status: "full", values };
  }
  if (error.code === "42501" || error.message === "event_not_found") {
    refresh();
    return { status: "closed", values };
  }

  console.error("Volunteer sign-up failed:", error);
  return { status: "error", message: "Something went wrong on our end. Please try again in a minute.", values };
}
