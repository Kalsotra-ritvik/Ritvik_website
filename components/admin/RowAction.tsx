"use client";

import { useState, useTransition } from "react";
import { restoreContent, restoreRevisionAction, type ActionResult } from "@/app/admin/content-actions";
import { btnSecondary } from "./ui";

/** A single confirm-then-run button used in the history and trash tables. */
export default function RowAction({ kind, id, label, confirm }: { kind: "revision" | "trash"; id: string | number; label: string; confirm: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        className={btnSecondary}
        disabled={pending}
        onClick={() => {
          if (!window.confirm(confirm)) return;
          start(async () => setResult(kind === "revision" ? await restoreRevisionAction(Number(id)) : await restoreContent(String(id))));
        }}
      >
        {pending ? "Working…" : label}
      </button>
      {result && <span className={`max-w-56 text-right text-xs ${result.ok ? "text-teal-400" : "text-coral-400"}`}>{result.ok ? result.message : result.error}</span>}
    </span>
  );
}
