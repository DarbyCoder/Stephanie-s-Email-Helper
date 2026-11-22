import Link from "next/link";
import type { ReactNode } from "react";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center px-4 py-3">
          <Link href="/" className="text-sm font-semibold tracking-tight text-slate-900">
            Startup Boston <span className="font-normal text-slate-500">· Volunteer Hub</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:py-10">{children}</main>
      <footer className="mx-auto w-full max-w-2xl px-4 py-6 text-xs text-slate-500">
        <Link href="/admin" className="hover:underline">
          Organizer login
        </Link>
      </footer>
    </div>
  );
}
