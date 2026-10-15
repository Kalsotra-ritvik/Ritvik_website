import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/dal";
import { LIST_TITLES, listTrash } from "@/lib/content/service";
import type { ListName } from "@/lib/content/schema";
import RowAction from "@/components/admin/RowAction";
import { PageHeader, card, formatDate } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Trash" };

export default async function TrashPage() {
  await requireAdmin();
  const items = await listTrash();
  return (
    <>
      <PageHeader title="Trash" description="Deleted items are kept here with their full history. Restoring brings an item back with the status it had before." />
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.id} className={`${card} flex flex-wrap items-center gap-3 p-4`}>
            <div className="mr-auto min-w-0">
              <p className="truncate font-medium">{i.title}</p>
              <p className="text-xs text-mist-400">
                {LIST_TITLES[i.collection as ListName] ?? i.collection} · deleted {formatDate(i.deletedAt)}
              </p>
            </div>
            <RowAction kind="trash" id={i.id} label="Restore" confirm="Restore this item?" />
          </li>
        ))}
        {items.length === 0 && <li className={`${card} p-8 text-center text-sm text-mist-400`}>The trash is empty.</li>}
      </ul>
    </>
  );
}
