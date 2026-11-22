import type { Metadata } from "next";
import { signOut } from "@/app/login/actions";

export const metadata: Metadata = {
  title: "Not an organizer account",
  robots: { index: false },
};

export default function NotAuthorizedPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="card w-full max-w-lg p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">This account isn&apos;t set up as the organizer</h1>
        <p className="mt-3 text-slate-600">
          You&apos;re signed in, but this account isn&apos;t on the organizer list. If it should be, run this
          once in the Supabase SQL Editor (with your email), then sign in again:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
          {`insert into public.admins (user_id)\nselect id from auth.users where email = 'you@example.com';`}
        </pre>
        <form action={signOut} className="mt-6">
          <button type="submit" className="btn btn-secondary">
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
