import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ADMIN_ROUTES, FORMS } from "@/lib/admin/forms";
import { requireAdmin } from "@/lib/auth/dal";
import { editableData, getEntry, labelFor, statusOf } from "@/lib/content/service";
import EntryEditor from "@/components/admin/EntryEditor";
import { Notice, PageHeader } from "@/components/admin/ui";

type Props = { params: Promise<{ section: string; id: string }>; searchParams: Promise<{ created?: string }> };

export const metadata: Metadata = { title: "Edit" };

export default async function ItemPage({ params, searchParams }: Props) {
  await requireAdmin();
  const { section, id } = await params;
  const { created } = await searchParams;
  const r = ADMIN_ROUTES[section];
  if (!r || !r.list) notFound();
  const isNew = id === "new";
  if (!isNew && !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const row = isNew ? null : await getEntry(id);
  if (!isNew && (!row || row.collection !== r.collection)) notFound();

  const data = editableData(r.collection, row);
  const slug = r.collection === "project" && typeof data.slug === "string" && data.slug ? `project-${data.slug}` : r.previewAnchor;
  return (
    <>
      <Link href={`/admin/${r.route}`} className="mb-3 inline-block text-sm text-mist-300 hover:text-mist-100">
        ← {r.title}
      </Link>
      <PageHeader title={isNew ? `New ${r.noun}` : labelFor(r.collection, row!.draftData)} />
      {row?.deletedAt ? (
        <Notice tone="warn" title="This item is in the trash.">
          Restore it from <Link href="/admin/trash" className="underline">Trash</Link> to edit it.
        </Notice>
      ) : (
        <EntryEditor
          collection={r.collection}
          route={r.route}
          listHref={`/admin/${r.route}`}
          entry={row ? { id: row.id, version: row.version, status: statusOf(row) } : null}
          initialData={data}
          sections={FORMS[r.collection]}
          isList
          previewAnchor={slug}
          initialNotice={created ? "Draft saved." : undefined}
        />
      )}
    </>
  );
}
