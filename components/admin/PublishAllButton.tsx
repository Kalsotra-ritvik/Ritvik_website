"use client";

import { useState, useTransition } from "react";
import { publishEverything, type ActionResult } from "@/app/admin/content-actions";
import { Notice, btnPrimary } from "./ui";

export default function PublishAllButton({ count }: { count: number }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <div className="space-y-2">
      <button
        type="button"
        className={btnPrimary}
        disabled={pending || count === 0}
        onClick={() => {
          if (!window.confirm(`Publish ${count} item${count === 1 ? "" : "s"} with unpublished changes? They become visible on the live site.`)) return;
          start(async () => setResult(await publishEverything()));
        }}
      >
        {pending ? "Publishing…" : `Publish all (${count})`}
      </button>
      {result && (result.ok ? <Notice tone="ok">{result.message}</Notice> : <Notice tone="error">{result.error}</Notice>)}
    </div>
  );
}
