import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Volunteer with Startup Boston",
    template: "%s · Startup Boston Volunteer Hub",
  },
  description: "Sign up to volunteer at Startup Boston community events.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
