"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { moveContent, publishContent, setVisibility, type ActionResult } from "@/app/admin/content-actions";
import { Notice, StatusBadge, btnGhost, btnSecondary, card, formatDate } from "./ui";

interface Item {
  id: string;
  title: string;
  status: string;
  version: number;
  visible: boolean;
  updatedAt: string;
}

export default function ListManager({ route, noun, items }: { route: string; noun: string; items: Item[] }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      setResult(await fn());
    });

  if (items.length === 0) {
    return (
      <div className={`${card} p-8 text-center text-sm text-mist-300`}>
        Nothing here yet.{" "}
        <Link href={`/admin/${route}/new`} className="text-amber-300 underline underline-offset-4">
          Add the first {noun}
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div aria-live="polite">{result && (result.ok ? <Notice tone="ok">{result.message}</Notice> : <Notice tone="error">{result.error}</Notice>)}</div>
      <ol className="space-y-2">
        {items.map((item, i) => (
          <li key={item.id} className={`${card} flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4`}>
            <div className="flex items-center gap-1 sm:flex-col">
              <button type="button" className={btnGhost} disabled={pending || i === 0} onClick={() => run(() => moveContent(item.id, -1))} aria-label={`Move ${item.title} up`}>
                ↑
              </button>
              <button
                type="button"
                className={btnGhost}
                disabled={pending || i === items.length - 1}
                onClick={() => run(() => moveContent(item.id, 1))}
                aria-label={`Move ${item.title} down`}
              >
                ↓
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`/admin/${route}/${item.id}`} className="line-clamp-2 block font-medium text-mist-100 hover:text-amber-300">
                {item.title}
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-mist-400">
                <StatusBadge status={item.status} />
                {!item.visible && <span className="rounded-full border border-ink-600 px-2 py-0.5">Hidden</span>}
                <span>Edited {formatDate(item.updatedAt)}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnGhost} disabled={pending} onClick={() => run(() => setVisibility(item.id, item.version, !item.visible))}>
                {item.visible ? "Hide" : "Show"}
              </button>
              {(item.status === "changed" || item.status === "draft" || item.status === "unpublished") && (
                <button type="button" className={btnSecondary} disabled={pending} onClick={() => run(() => publishContent(item.id, item.version))}>
                  Publish
                </button>
              )}
              <Link href={`/admin/${route}/${item.id}`} className={btnSecondary}>
                Edit
              </Link>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-xs text-mist-400">Reordering and showing/hiding change the drafts. Publish the affected items (or use Publish all on the dashboard) to update the site.</p>
    </div>
  );
}
