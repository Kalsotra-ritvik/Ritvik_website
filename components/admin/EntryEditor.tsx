"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type { FormSection } from "@/lib/admin/forms";
import {
  deleteContent,
  discardContent,
  duplicateContent,
  publishContent,
  saveContent,
  unpublishContent,
  type ActionResult,
} from "@/app/admin/content-actions";
import { FieldView, setAt, splitPath, type Data, type Issues } from "./fields";
import { markDirty } from "./UnsavedGuard";
import {
  Notice,
  StatusBadge,
  btnDanger,
  btnGhost,
  btnPrimary,
  btnSecondary,
  card,
} from "./ui";

export interface EditorProps {
  collection: string;
  /** Admin URL of the list this item belongs to (lists only). */
  listHref?: string;
  /** Path segment used for /admin/<route>/<id> after creating an item. */
  route: string;
  entry: { id: string; version: number; status: string } | null;
  initialData: Data;
  /** Defaults offered by "Reset to defaults" (visual settings). */
  defaults?: Data;
  sections: FormSection[];
  isList: boolean;
  /** Section anchor to open in draft preview. */
  previewAnchor?: string;
}

export default function EntryEditor({
  collection,
  listHref,
  route,
  entry: initialEntry,
  initialData,
  defaults,
  sections,
  isList,
  previewAnchor,
}: EditorProps) {
  const router = useRouter();
  const editorId = useId();
  const previewForm = useRef<HTMLFormElement>(null);
  const [entry, setEntry] = useState(initialEntry);
  const [data, setData] = useState<Data>(initialData);
  const [saved, setSaved] = useState(() => JSON.stringify(initialData));
  const [issues, setIssues] = useState<Issues>({});
  const [result, setResult] = useState<ActionResult | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [pending, startTransition] = useTransition();

  const dirty = useMemo(() => JSON.stringify(data) !== saved, [data, saved]);
  useEffect(() => {
    markDirty(editorId, dirty);
    return () => markDirty(editorId, false);
  }, [dirty, editorId]);

  const onChange = useCallback((path: (string | number)[], value: unknown) => {
    setData((d) => setAt(d, path, value));
  }, []);

  function applyResult(r: ActionResult, opts: { replaceData?: boolean } = {}) {
    setResult(r);
    if (!r.ok) {
      setIssues(
        Object.fromEntries(
          (r.issues ?? [])
            .filter((i) => i.path)
            .map((i) => [i.path, i.message]),
        ),
      );
      return false;
    }
    setIssues({});
    if (r.entry) setEntry(r.entry);
    if (r.data) {
      const json = JSON.stringify(r.data);
      setSaved(json);
      if (opts.replaceData) {
        setData(r.data);
        setFormKey((k) => k + 1);
      } else setData(r.data);
    }
    return true;
  }

  const save = (publish: boolean, then?: () => void) =>
    startTransition(async () => {
      const wasNew = !entry;
      const r = await saveContent({
        collection,
        id: entry?.id ?? null,
        version: entry?.version ?? null,
        data,
        publish,
      });
      if (applyResult(r) && r.ok) {
        if (wasNew && r.entry && isList) {
          markDirty(editorId, false);
          router.replace(`/admin/${route}/${r.entry.id}`);
        }
        then?.();
      }
    });

  const act = (
    fn: () => Promise<ActionResult>,
    opts: { replaceData?: boolean; after?: (r: ActionResult) => void } = {},
  ) =>
    startTransition(async () => {
      const r = await fn();
      if (applyResult(r, opts)) opts.after?.(r);
    });

  // Ctrl/Cmd + S saves the draft.
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const status = entry?.status ?? "draft";
  const issueList = result && !result.ok ? (result.issues ?? []) : [];
  const conflict = result && !result.ok && result.code === "conflict";

  return (
    <div>
      <div
        className={`${card} sticky top-14 z-30 mb-6 flex flex-wrap items-center gap-2 p-3 lg:top-3`}
      >
        <div className="mr-auto flex min-w-0 flex-wrap items-center gap-2">
          {entry ? (
            <StatusBadge status={status} />
          ) : (
            <StatusBadge status="draft" />
          )}
          {dirty && (
            <span
              className="inline-flex items-center gap-1.5 text-xs text-amber-300"
              role="status"
            >
              <span
                className="h-1.5 w-1.5 rounded-full bg-amber-300"
                aria-hidden="true"
              />{" "}
              Unsaved changes
            </span>
          )}
        </div>
        <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto">
          <button
            type="button"
            className={btnSecondary}
            disabled={pending || (!dirty && !!entry)}
            onClick={() => save(false)}
          >
            {pending ? "Working…" : "Save draft"}
          </button>
          <button
            type="button"
            className={btnSecondary}
            disabled={pending}
            onClick={() =>
              dirty || !entry
                ? save(false, () => previewForm.current?.requestSubmit())
                : previewForm.current?.requestSubmit()
            }
            title="Save the draft and open the site with unpublished changes (visible only to you)"
          >
            Preview
          </button>
          <button
            type="button"
            className={btnPrimary}
            disabled={pending || (!dirty && status === "published")}
            onClick={() =>
              dirty || !entry
                ? save(true)
                : act(() => publishContent(entry.id, entry.version))
            }
          >
            {dirty || !entry ? "Save & publish" : "Publish"}
          </button>
        </div>
      </div>

      <form
        ref={previewForm}
        action="/admin/preview/enable"
        method="post"
        target="_blank"
        className="hidden"
      >
        {previewAnchor && (
          <input type="hidden" name="anchor" value={previewAnchor} />
        )}
      </form>

      <div className="space-y-3" aria-live="polite">
        {result?.ok && <Notice tone="ok">{result.message}</Notice>}
        {result && !result.ok && (
          <Notice tone="error" title={result.error}>
            {issueList.length > 0 && (
              <ul className="list-disc pl-5">
                {issueList.slice(0, 12).map((i, n) => (
                  <li key={n}>
                    {i.path ? (
                      <span className="font-mono text-xs">{i.path}</span>
                    ) : null}{" "}
                    {i.message}
                  </li>
                ))}
              </ul>
            )}
            {conflict && (
              <button
                type="button"
                className={`${btnSecondary} mt-2`}
                onClick={() => {
                  markDirty(editorId, false);
                  window.location.reload();
                }}
              >
                Reload the latest version
              </button>
            )}
          </Notice>
        )}
      </div>

      <div key={formKey} className="mt-4 space-y-6">
        {sections.map((section) => (
          <section
            key={section.title}
            className={`${card} p-4 sm:p-6`}
            aria-labelledby={`${editorId}-${section.title}`}
          >
            <h2
              id={`${editorId}-${section.title}`}
              className="text-lg font-medium text-mist-100"
            >
              {section.title}
            </h2>
            {section.description && (
              <p className="mt-1 text-sm text-mist-400">
                {section.description}
              </p>
            )}
            <div className="mt-5 grid gap-5">
              {section.fields.map((f) => (
                <FieldView
                  key={f.name}
                  field={f}
                  path={splitPath(f.name)}
                  data={data}
                  onChange={onChange}
                  issues={issues}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className={`${card} mt-8 flex flex-wrap items-center gap-2 p-4`}>
        <p className="mr-auto text-sm text-mist-400">More actions</p>
        {defaults && (
          <button
            type="button"
            className={btnGhost}
            disabled={pending}
            onClick={() => {
              if (
                !window.confirm(
                  "Replace every field on this page with the original defaults? Nothing is saved until you press Save.",
                )
              )
                return;
              setData(structuredClone(defaults));
              setFormKey((k) => k + 1);
            }}
          >
            Reset to defaults
          </button>
        )}
        {entry && (status === "changed" || dirty) && (
          <button
            type="button"
            className={btnGhost}
            disabled={pending}
            onClick={() => {
              if (dirty && status !== "changed") {
                if (!window.confirm("Discard your unsaved edits?")) return;
                setData(JSON.parse(saved));
                setFormKey((k) => k + 1);
                return;
              }
              if (
                !window.confirm(
                  "Discard all draft changes and go back to the published version?",
                )
              )
                return;
              act(() => discardContent(entry.id, entry.version), {
                replaceData: true,
              });
            }}
          >
            Discard changes
          </button>
        )}
        {entry && (
          <Link href={`/admin/history?entry=${entry.id}`} className={btnGhost}>
            Version history
          </Link>
        )}
        {entry && isList && (
          <button
            type="button"
            className={btnGhost}
            disabled={pending}
            onClick={() =>
              act(() => duplicateContent(entry.id), {
                after: (r) =>
                  r.ok &&
                  r.entry &&
                  router.push(`/admin/${route}/${r.entry.id}`),
              })
            }
          >
            Duplicate
          </button>
        )}
        {entry &&
          isList &&
          (status === "published" || status === "changed") && (
            <button
              type="button"
              className={btnSecondary}
              disabled={pending}
              onClick={() =>
                window.confirm(
                  "Remove this item from the public site? It stays here as a draft.",
                ) && act(() => unpublishContent(entry.id, entry.version))
              }
            >
              Unpublish
            </button>
          )}
        {entry && isList && (
          <button
            type="button"
            className={btnDanger}
            disabled={pending}
            onClick={() => {
              if (
                !window.confirm(
                  "Move this item to the trash? It disappears from the site and can be restored from Trash.",
                )
              )
                return;
              act(() => deleteContent(entry.id, entry.version), {
                after: () => {
                  markDirty(editorId, false);
                  router.push(listHref ?? "/admin");
                },
              });
            }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
