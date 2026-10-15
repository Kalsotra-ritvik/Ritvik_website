import type { Metadata } from "next";
import type { ReactNode } from "react";

// Every admin page reads the session cookie at request time, so admin routes
// are allowed to block instead of serving a prerendered static shell.
export const instant = false;

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <div className="admin min-h-dvh bg-ink-950 text-mist-100">{children}</div>;
}
