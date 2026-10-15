import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ADMIN_ROUTES, FORMS } from "@/lib/admin/forms";
import { requireAdmin } from "@/lib/auth/dal";
import { SINGLETON_DEFAULTS } from "@/lib/content/defaults";
import { editableData, getSingletonEntry, listEntries, statusOf } from "@/lib/content/service";
import type { ListName, SingletonName } from "@/lib/content/schema";
import EntryEditor from "@/components/admin/EntryEditor";
import ListManager from "@/components/admin/ListManager";
import { PageHeader, btnPrimary } from "@/components/admin/ui";

type Props = { params: Promise<{ section: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = ADMIN_ROUTES[(await params).section];
  return { title: r?.title ?? "Not found" };
}

export default async function SectionPage({ params }: Props) {
  await requireAdmin();
  const { section } = await params;
  const r = ADMIN_ROUTES[section];
  if (!r) notFound();

  if (r.list) {
    const items = await listEntries(r.collection as ListName);
    return (
      <>
        <PageHeader
          title={r.title}
          description={r.description}
          actions={
            <Link href={`/admin/${r.route}/new`} className={btnPrimary}>
              + New {r.noun}
            </Link>
          }
        />
        <ListManager
          route={r.route}
          noun={r.noun ?? "item"}
          items={items.map((i) => ({ id: i.id, title: i.title, status: i.status, version: i.version, visible: i.visible, updatedAt: i.updatedAt.toISOString() }))}
        />
      </>
    );
  }

  const name = r.collection as SingletonName;
  const row = await getSingletonEntry(name);
  return (
    <>
      <PageHeader title={r.title} description={r.description} />
      <EntryEditor
        collection={name}
        route={r.route}
        entry={row ? { id: row.id, version: row.version, status: statusOf(row) } : null}
        initialData={editableData(name, row)}
        defaults={name === "visual" ? structuredClone(SINGLETON_DEFAULTS.visual) : undefined}
        sections={FORMS[name]}
        isList={false}
        previewAnchor={r.previewAnchor}
      />
    </>
  );
}
