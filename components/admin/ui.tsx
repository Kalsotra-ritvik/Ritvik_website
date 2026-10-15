/** Small presentational helpers shared by the admin pages (server- and client-safe). */
import type { ReactNode } from "react";

export const input =
  "w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-[15px] text-mist-100 placeholder:text-mist-400/70 focus:border-amber-300 focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-amber-300/30 disabled:opacity-60";
export const btn =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
export const btnPrimary = `${btn} bg-amber-300 text-ink-900 hover:bg-amber-400`;
export const btnSecondary = `${btn} border border-ink-600 bg-ink-850 text-mist-100 hover:border-mist-400`;
export const btnGhost = `${btn} text-mist-300 hover:bg-ink-800 hover:text-mist-100`;
export const btnDanger = `${btn} border border-coral-400/50 text-coral-400 hover:bg-coral-400/10`;
export const card = "rounded-xl border border-ink-700 bg-ink-900/80";

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-3xl leading-tight text-mist-100 sm:text-4xl">{title}</h1>
        {description && <div className="mt-2 max-w-2xl text-sm text-mist-300">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  published: "bg-teal-400/15 text-teal-400 border-teal-400/30",
  changed: "bg-amber-300/15 text-amber-300 border-amber-300/30",
  draft: "bg-blue-400/15 text-blue-400 border-blue-400/30",
  unpublished: "bg-mist-400/10 text-mist-300 border-mist-400/30",
};
const STATUS_TEXT: Record<string, string> = {
  published: "Published",
  changed: "Unpublished changes",
  draft: "Draft",
  unpublished: "Unpublished",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status] ?? STATUS_STYLE.unpublished}`}>
      {STATUS_TEXT[status] ?? status}
    </span>
  );
}

export function Notice({ tone = "info", title, children }: { tone?: "info" | "warn" | "error" | "ok"; title?: string; children?: ReactNode }) {
  const styles = {
    info: "border-blue-400/30 bg-blue-400/10",
    warn: "border-amber-300/40 bg-amber-300/10",
    error: "border-coral-400/50 bg-coral-400/10",
    ok: "border-teal-400/40 bg-teal-400/10",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm text-mist-100 ${styles}`}>
      {title && <p className="font-medium">{title}</p>}
      {children && <div className={title ? "mt-1 text-mist-200" : ""}>{children}</div>}
    </div>
  );
}

export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
