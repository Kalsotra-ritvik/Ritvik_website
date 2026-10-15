import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { getEntry, labelFor, listRevisions } from "@/lib/content/service";
import RowAction from "@/components/admin/RowAction";
import { PageHeader, card, formatDate } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Revision history" };

const ACTION_TEXT: Record<string, string> = {
  create: "Created",
  save: "Draft saved",
  publish: "Published",
  unpublish: "Unpublished",
  discard: "Draft discarded",
  delete: "Moved to trash",
  restore: "Restored from trash",
  revert: "Earlier version restored",
  reorder: "Reordered",
  seed: "Imported",
};

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ entry?: string }> }) {
  await requireAdmin();
  const { entry } = await searchParams;
  const entryId = entry && /^[0-9a-f-]{36}$/.test(entry) ? entry : undefined;
  const target = entryId ? await getEntry(entryId) : null;
  const revisions = await listRevisions({ entryId, limit: entryId ? 100 : 60 });
  return (
    <>
      <PageHeader
        title="Revision history"
        description={
          target ? (
            <>
              Versions of <strong>{labelFor(target.collection, target.draftData)}</strong>. Restoring copies that version into the draft; publish it to make it live.{" "}
              <Link href="/admin/history" className="underline">
                Show all changes
              </Link>
            </>
          ) : (
            "Every save, publish and delete is recorded. Restoring a version copies it into the draft; nothing reaches the site until you publish."
          )
        }
      />
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-ink-700 text-xs uppercase tracking-wider text-mist-400">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">Change</th>
              <th className="px-4 py-3 font-medium">By</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-700">
            {revisions.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap px-4 py-3 text-mist-300">{formatDate(r.createdAt)}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/history?entry=${r.entryId}`} className="hover:text-amber-300">
                    {r.title}
                  </Link>
                  <span className="block font-mono text-[11px] text-mist-400">{r.collection}</span>
                </td>
                <td className="px-4 py-3 text-mist-300">{ACTION_TEXT[r.action] ?? r.action}</td>
                <td className="px-4 py-3 text-mist-400">{r.adminLogin ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <RowAction kind="revision" id={r.id} label="Restore as draft" confirm="Copy this version into the draft? Your current draft is kept in the history." />
                </td>
              </tr>
            ))}
            {revisions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-mist-400">
                  No changes recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
