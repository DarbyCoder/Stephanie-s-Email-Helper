import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/login/actions";

export const metadata: Metadata = {
  title: { default: "Organizer", template: "%s · Volunteer Hub" },
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Events" },
  { href: "/admin/email", label: "Email" },
  { href: "/admin/settings", label: "Settings" },
] as const;

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/admin" className="font-semibold tracking-tight">
            Volunteer Hub
          </Link>
          <nav className="flex gap-1 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <form action={signOut} className="ml-auto">
            <button type="submit" className="text-sm font-medium text-slate-500 hover:text-slate-900">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
