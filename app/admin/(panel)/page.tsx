import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { ADMIN_ROUTES } from "@/lib/admin/forms";
import { LIST_TITLES, dashboardSummary } from "@/lib/content/service";
import type { ListName } from "@/lib/content/schema";
import { storageStatus } from "@/lib/storage";
import PublishAllButton from "@/components/admin/PublishAllButton";
import { Notice, PageHeader, StatusBadge, btnSecondary, card, formatDate } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Dashboard" };

const ROUTE_FOR: Record<string, string> = Object.fromEntries(Object.values(ADMIN_ROUTES).map((r) => [r.collection, r.route]));
const hrefFor = (collection: string, id: string) => (ADMIN_ROUTES[ROUTE_FOR[collection]]?.list ? `/admin/${ROUTE_FOR[collection]}/${id}` : `/admin/${ROUTE_FOR[collection]}`);

export default async function Dashboard() {
  const session = await requireAdmin();
  const summary = await dashboardSummary();
  const storage = storageStatus();
  const warnings: { title: string; body: string }[] = [];
  if (!summary.seeded) warnings.push({ title: "The content database is empty", body: "Run npm run db:seed once to import the current portfolio content. Until then the site shows built-in defaults." });
  if (summary.singletonsMissing.length && summary.seeded)
    warnings.push({ title: "Some site-wide sections have never been saved", body: `The site uses built-in defaults for: ${summary.singletonsMissing.join(", ")}.` });
  if (!storage.ready) warnings.push({ title: "Media uploads are not available", body: storage.message });
  if (!process.env.SITE_URL) warnings.push({ title: "SITE_URL is not set", body: "Set SITE_URL to the public address (e.g. https://example.com) so sharing previews use absolute image URLs." });

  const countRows = (Object.keys(LIST_TITLES) as ListName[]).map((c) => ({ c, title: LIST_TITLES[c], ...summary.counts[c] }));

  return (
    <>
      <PageHeader
        title={`Welcome${session.admin.displayName ? `, ${session.admin.displayName}` : ""}`}
        description={<>Last published: {formatDate(summary.lastPublished)}. Edits are saved as drafts and appear on the site only after you publish them.</>}
        actions={
          <form action="/admin/preview/enable" method="post" target="_blank">
            <button type="submit" className={btnSecondary}>
              Preview drafts ↗
            </button>
          </form>
        }
      />

      {warnings.length > 0 && (
        <div className="mb-6 space-y-2">
          {warnings.map((w) => (
            <Notice key={w.title} tone="warn" title={w.title}>
              {w.body}
            </Notice>
          ))}
        </div>
      )}

      <section aria-labelledby="pending-h" className={`${card} mb-6 p-4 sm:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="pending-h" className="text-lg font-medium">
              Waiting to be published
            </h2>
            <p className="mt-1 text-sm text-mist-400">{summary.pending.length ? "These drafts differ from what visitors currently see." : "Everything on the site is up to date."}</p>
          </div>
          <PublishAllButton count={summary.pending.length} />
        </div>
        {summary.pending.length > 0 && (
          <ul className="mt-4 divide-y divide-ink-700">
            {summary.pending.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <Link href={hrefFor(p.collection, p.id)} className="mr-auto min-w-0 truncate text-sm hover:text-amber-300">
                  {p.title}
                </Link>
                <StatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="counts-h" className="mb-6">
        <h2 id="counts-h" className="sr-only">
          Content summary
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {countRows.map((r) => (
            <li key={r.c}>
              <Link href={`/admin/${ROUTE_FOR[r.c]}`} className={`${card} block p-4 hover:border-mist-400`}>
                <p className="font-display text-3xl">{r.total}</p>
                <p className="mt-1 text-sm text-mist-300">{r.title}</p>
                {r.total !== r.visible && <p className="text-xs text-mist-400">{r.total - r.visible} hidden</p>}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/admin/skills" className={`${card} block p-4 hover:border-mist-400`}>
              <p className="font-display text-3xl">{summary.skills}</p>
              <p className="mt-1 text-sm text-mist-300">Individual skills</p>
            </Link>
          </li>
          <li>
            <Link href="/admin/media" className={`${card} block p-4 hover:border-mist-400`}>
              <p className="font-display text-3xl">{summary.mediaCount}</p>
              <p className="mt-1 text-sm text-mist-300">Media files</p>
            </Link>
          </li>
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="recent-h" className={`${card} p-4 sm:p-6`}>
          <h2 id="recent-h" className="text-lg font-medium">
            Recently edited
          </h2>
          <ul className="mt-3 divide-y divide-ink-700">
            {summary.recent.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <Link href={hrefFor(p.collection, p.id)} className="mr-auto min-w-0 truncate text-sm hover:text-amber-300">
                  {p.title}
                </Link>
                <span className="text-xs text-mist-400">{formatDate(p.updatedAt)}</span>
              </li>
            ))}
          </ul>
          <Link href="/admin/history" className="mt-3 inline-block text-sm text-mist-300 underline underline-offset-4">
            Full revision history
          </Link>
        </section>
        <section aria-labelledby="quick-h" className={`${card} p-4 sm:p-6`}>
          <h2 id="quick-h" className="text-lg font-medium">
            Quick links
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              ["/admin/projects/new", "Add a project"],
              ["/admin/credentials/new", "Add a publication or poster"],
              ["/admin/profile", "Edit profile, hero & CV"],
              ["/admin/media", "Upload media"],
              ["/admin/visual", "Adjust visual settings"],
              ["/admin/sections", "Navigation & section order"],
              ["/admin/account", "Change password"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="block rounded-lg border border-ink-700 px-3 py-2 text-sm hover:border-mist-400">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
