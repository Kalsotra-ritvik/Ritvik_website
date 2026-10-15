/** Shown on top of the portfolio while an administrator previews drafts. */
export default function PreviewBanner() {
  return (
    <div role="status" className="fixed inset-x-0 bottom-0 z-[70] flex justify-center p-3" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
      <div className="flex flex-wrap items-center gap-3 rounded-full border border-amber-300/50 bg-ink-900/95 px-4 py-2 text-sm text-mist-100 shadow-2xl">
        <span className="h-2 w-2 rounded-full bg-amber-300" aria-hidden="true" />
        Draft preview — unpublished changes are visible only to you.
        <form action="/admin/preview/exit" method="post">
          <button type="submit" className="rounded-full bg-amber-300 px-3 py-1 font-medium text-ink-900">
            Exit preview
          </button>
        </form>
        <a href="/admin" className="underline underline-offset-4">
          Back to admin
        </a>
      </div>
    </div>
  );
}
