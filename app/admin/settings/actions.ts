"use server";

import { revalidatePath } from "next/cache";
import { requireOrganizer } from "@/lib/auth";
import { normalizeBaseUrl } from "@/lib/origin";
import { isValidEmail } from "@/lib/validation";

export type SettingsState = { status: "idle" | "saved" | "error"; message?: string };

const MAX_TEXT = 5000;

export async function saveSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const supabase = await requireOrganizer();

  // Keep the email text exactly as typed (only normalize line endings).
  const text = (name: string) => String(formData.get(name) ?? "").replace(/\r\n/g, "\n");
  const email_intro = text("email_intro");
  const email_outro = text("email_outro");
  const signature = text("signature");
  const rawBaseUrl = text("site_base_url").trim();
  const gmail_account = text("gmail_account").trim().toLowerCase();

  if ([email_intro, email_outro, signature].some((t) => t.length > MAX_TEXT)) {
    return { status: "error", message: `Each text box can hold up to ${MAX_TEXT} characters.` };
  }
  const site_base_url = normalizeBaseUrl(rawBaseUrl);
  if (rawBaseUrl && !site_base_url) {
    return { status: "error", message: "The site base URL should look like https://volunteer.example.org" };
  }
  if (gmail_account && !isValidEmail(gmail_account)) {
    return { status: "error", message: "The Gmail account should be an email address." };
  }

  const { error } = await supabase
    .from("settings")
    .update({ email_intro, email_outro, signature, site_base_url, gmail_account })
    .eq("id", true);
  if (error) return { status: "error", message: `Could not save settings: ${error.message}` };

  revalidatePath("/admin", "layout");
  return { status: "saved" };
}
