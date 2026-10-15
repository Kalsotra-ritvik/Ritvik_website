"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const GROUPS: { title: string; items: { href: string; label: string }[] }[] = [
  { title: "", items: [{ href: "/admin", label: "Dashboard" }] },
  {
    title: "Content",
    items: [
      { href: "/admin/profile", label: "Profile & hero" },
      { href: "/admin/projects", label: "Projects" },
      { href: "/admin/experience", label: "Experience" },
      { href: "/admin/education", label: "Education" },
      { href: "/admin/skills", label: "Skills" },
      { href: "/admin/credentials", label: "Publications & credentials" },
      { href: "/admin/science", label: "Scientific text" },
      { href: "/admin/annotations", label: "Scene annotations" },
      { href: "/admin/figures", label: "Figures" },
    ],
  },
  {
    title: "Site",
    items: [
      { href: "/admin/sections", label: "Navigation & sections" },
      { href: "/admin/site", label: "Contact, footer & SEO" },
      { href: "/admin/visual", label: "Visual settings" },
      { href: "/admin/media", label: "Media library" },
    ],
  },
  {
    title: "Records",
    items: [
      { href: "/admin/history", label: "Revision history" },
      { href: "/admin/trash", label: "Trash" },
      { href: "/admin/account", label: "Account & security" },
    ],
  },
];

export default function AdminNav({ loginId, signOut }: { loginId: string; signOut: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/"));

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-ink-700 bg-ink-950/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/admin" className="font-display text-xl">
          Admin
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="admin-nav"
          className="rounded-lg border border-ink-600 px-3 py-1.5 text-sm"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
      <nav
        id="admin-nav"
        aria-label="Admin"
        className={`${open ? "block" : "hidden"} border-b border-ink-700 bg-ink-950 lg:sticky lg:top-0 lg:block lg:h-dvh lg:w-64 lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-b-0`}
      >
        <div className="flex h-full flex-col gap-6 px-3 py-5">
          <Link href="/admin" className="hidden px-3 font-display text-2xl lg:block">
            Admin
          </Link>
          {GROUPS.map((g) => (
            <div key={g.title || "home"}>
              {g.title && <p className="mb-1.5 px-3 font-mono text-[11px] uppercase tracking-[0.16em] text-mist-400">{g.title}</p>}
              <ul className="space-y-0.5">
                {g.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active(item.href) ? "page" : undefined}
                      className={`block rounded-lg px-3 py-2 text-sm ${
                        active(item.href) ? "bg-ink-800 text-mist-100" : "text-mist-300 hover:bg-ink-850 hover:text-mist-100"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="mt-auto space-y-2 border-t border-ink-700 px-3 pt-4 text-sm">
            <p className="truncate text-mist-400" title={loginId}>
              Signed in as <span className="text-mist-200">{loginId}</span>
            </p>
            <a href="/" target="_blank" rel="noopener" className="block text-mist-300 hover:text-mist-100">
              View live site ↗
            </a>
            {signOut}
          </div>
        </div>
      </nav>
    </>
  );
}
