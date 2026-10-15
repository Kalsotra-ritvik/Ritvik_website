"use client";

import { useMemo, useState } from "react";
import { skillGroups } from "@/data/profile";
import { ChapterHeader } from "@/components/ui";

export default function Skills() {
  const [group, setGroup] = useState<string>("all");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const groups = useMemo(
    () =>
      skillGroups
        .filter((g) => group === "all" || g.id === group)
        .map((g) => ({ ...g, items: g.items.filter((i) => !q || i.toLowerCase().includes(q)) }))
        .filter((g) => g.items.length > 0),
    [group, q],
  );
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <section id="skills" data-chapter="skills" className="on-light border-t border-umber-900/10 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ChapterHeader index="10" label="Skills" title={<>Methods &amp; tools</>} light>
          <p>Listed as in the CV, grouped by kind. No proficiency ratings — the projects above show where each was used.</p>
        </ChapterHeader>

        <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div role="group" aria-label="Filter skills by group" className="flex flex-wrap gap-2">
            {[{ id: "all", label: "All" }, ...skillGroups].map((g) => (
              <button
                key={g.id}
                type="button"
                aria-pressed={group === g.id}
                onClick={() => setGroup(g.id)}
                className={`min-h-[40px] rounded-full border px-4 text-sm transition-colors ${
                  group === g.id ? "border-umber-900 bg-umber-900 text-ivory-50" : "border-umber-900/20 text-umber-900 hover:border-rust-500 hover:text-rust-500"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <label className="relative block w-full lg:w-72">
            <span className="sr-only">Search skills</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search, e.g. docking"
              className="min-h-[44px] w-full rounded-full border border-umber-900/20 bg-white/70 px-4 text-sm text-umber-900 placeholder:text-taupe-500 focus:border-rust-500 focus:outline-none"
            />
          </label>
        </div>
        <p className="sr-only" aria-live="polite">
          {total} skills shown
        </p>

        <div className="mt-10 grid gap-x-10 gap-y-10 md:grid-cols-2">
          {groups.map((g) => (
            <div key={g.id}>
              <h3 className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-taupe-500">{g.label}</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {g.items.map((i) => (
                  <li key={i} className="chip">
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {groups.length === 0 && <p className="text-taupe-700">No skills match “{query}”.</p>}
        </div>
      </div>
    </section>
  );
}
