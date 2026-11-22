import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/skeleton";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Organizer sign in",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="card w-full max-w-sm p-6 sm:p-8">
        <p className="text-sm font-semibold text-slate-500">Startup Boston Volunteer Hub</p>
        <h1 className="mt-1 mb-6 text-2xl font-semibold tracking-tight">Organizer sign in</h1>
        <Suspense fallback={<Skeleton lines={3} />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
