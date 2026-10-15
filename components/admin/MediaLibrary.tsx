"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeMedia, saveMediaMeta } from "@/app/admin/media-actions";
import { Notice, btnDanger, btnGhost, btnPrimary, btnSecondary, card, formatBytes, formatDate, input } from "./ui";
import { uploadFile, type StorageInfo, type UploadedMedia } from "./upload";

type Usage = Record<string, { id: string; collection: string; title: string; deleted: boolean }[]>;
const KINDS = ["all", "image", "video", "pdf", "model"] as const;

export default function MediaLibrary({ initialItems, usage, storage }: { initialItems: UploadedMedia[]; usage: Usage; storage: StorageInfo }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [kind, setKind] = useState<(typeof KINDS)[number]>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [uploads, setUploads] = useState<{ name: string; progress: number; error?: string }[]>([]);
  useEffect(() => setItems(initialItems), [initialItems]);

  const shown = useMemo(
    () => items.filter((m) => (kind === "all" || m.kind === kind) && (!query || `${m.title ?? ""} ${m.originalName} ${m.alt ?? ""}`.toLowerCase().includes(query.toLowerCase()))),
    [items, kind, query],
  );
  const current = items.find((m) => m.id === selected) ?? null;

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    setUploads(list.map((f) => ({ name: f.name, progress: 0 })));
    for (let i = 0; i < list.length; i++) {
      try {
        const item = await uploadFile(list[i], storage, (p) => setUploads((u) => u.map((x, j) => (j === i ? { ...x, progress: p } : x))));
        setItems((prev) => [item, ...prev]);
        setUploads((u) => u.map((x, j) => (j === i ? { ...x, progress: 1 } : x)));
      } catch (e) {
        setUploads((u) => u.map((x, j) => (j === i ? { ...x, error: (e as Error).message } : x)));
      }
    }
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {storage.ready && (
            <label className={`${btnPrimary} cursor-pointer`}>
              Upload files
              <input type="file" multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} />
            </label>
          )}
          <div role="group" aria-label="Filter by type" className="flex flex-wrap gap-1">
            {KINDS.map((k) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={`${btnGhost} ${kind === k ? "bg-ink-800 text-mist-100" : ""}`}>
                {k === "all" ? "All" : k === "pdf" ? "PDF" : k[0].toUpperCase() + k.slice(1) + "s"}
              </button>
            ))}
          </div>
          <input className={`${input} sm:ml-auto sm:w-56`} placeholder="Search" aria-label="Search media" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {uploads.length > 0 && (
          <ul className="mb-4 space-y-1 text-sm" aria-live="polite">
            {uploads.map((u, i) => (
              <li key={i} className={u.error ? "text-coral-400" : "text-mist-300"}>
                {u.name}: {u.error ? u.error : u.progress >= 1 ? "uploaded" : `${Math.round(u.progress * 100)}%`}
              </li>
            ))}
          </ul>
        )}
        {shown.length === 0 ? (
          <p className={`${card} p-8 text-center text-sm text-mist-400`}>{items.length ? "No files match." : "The library is empty."}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {shown.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setSelected(m.id)}
                  aria-pressed={selected === m.id}
                  className={`w-full overflow-hidden rounded-xl border bg-ink-900 text-left ${selected === m.id ? "border-amber-300" : "border-ink-700 hover:border-mist-400"}`}
                >
                  <div className="flex aspect-[4/3] items-center justify-center bg-ink-850">
                    {m.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail of uploaded media
                      <img src={m.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <span className="font-mono text-xs text-mist-300">{m.kind.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="truncate text-sm">{m.title || m.originalName}</p>
                    <p className="text-xs text-mist-400">
                      {formatBytes(m.size)} · {usage[m.id]?.length ? `used ${usage[m.id].length}×` : "unused"}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <aside className="lg:sticky lg:top-6 lg:self-start">
        {current ? (
          <Details
            key={current.id}
            item={current}
            usage={usage[current.id] ?? []}
            storage={storage}
            onChanged={(item) => setItems((list) => list.map((m) => (m.id === item.id ? item : m)))}
            onDeleted={() => {
              setItems((list) => list.filter((m) => m.id !== current.id));
              setSelected(null);
            }}
          />
        ) : (
          <p className={`${card} p-6 text-sm text-mist-400`}>Select a file to edit its title and alternative text, copy its address, replace it or delete it.</p>
        )}
      </aside>
    </div>
  );
}

function Details({
  item,
  usage,
  storage,
  onChanged,
  onDeleted,
}: {
  item: UploadedMedia;
  usage: Usage[string];
  storage: StorageInfo;
  onChanged: (m: UploadedMedia) => void;
  onDeleted: () => void;
}) {
  const [title, setTitle] = useState(item.title ?? "");
  const [alt, setAlt] = useState(item.alt ?? "");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [progress, setProgress] = useState<number | null>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const absolute = typeof window !== "undefined" ? new URL(item.url, window.location.origin).toString() : item.url;

  return (
    <div className={`${card} space-y-4 p-4`}>
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-ink-850">
        {item.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview
          <img src={item.url} alt={item.alt ?? ""} className="h-full w-full object-contain" />
        ) : item.kind === "video" ? (
          <video src={item.url} controls className="h-full w-full" />
        ) : (
          <a href={item.url} target="_blank" rel="noopener" className="font-mono text-sm text-amber-300 underline">
            Open {item.kind.toUpperCase()} ↗
          </a>
        )}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-mist-400">File</dt>
        <dd className="break-all">{item.originalName}</dd>
        <dt className="text-mist-400">Type</dt>
        <dd>{item.mime}</dd>
        <dt className="text-mist-400">Size</dt>
        <dd>
          {formatBytes(item.size)}
          {item.width && item.height ? ` · ${item.width}×${item.height}px` : ""}
        </dd>
        <dt className="text-mist-400">Added</dt>
        <dd>{formatDate(item.createdAt)}</dd>
      </dl>
      <div>
        <label htmlFor="media-title" className="mb-1 block text-sm text-mist-200">
          Title
        </label>
        <input id="media-title" className={input} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label htmlFor="media-alt" className="mb-1 block text-sm text-mist-200">
          Default alternative text
        </label>
        <textarea id="media-alt" rows={2} className={input} value={alt} maxLength={300} onChange={(e) => setAlt(e.target.value)} />
        <p className="mt-1 text-xs text-mist-400">Used wherever this file appears without its own description.</p>
      </div>
      {message && <Notice tone={message.ok ? "ok" : "error"}>{message.text}</Notice>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={btnPrimary}
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await saveMediaMeta(item.id, title, alt);
              setMessage({ ok: r.ok, text: r.ok ? r.message : r.error });
              if (r.ok && r.item) onChanged(r.item);
            })
          }
        >
          Save details
        </button>
        <button
          type="button"
          className={btnSecondary}
          onClick={() =>
            navigator.clipboard.writeText(absolute).then(
              () => setMessage({ ok: true, text: "Address copied." }),
              () => setMessage({ ok: false, text: absolute }),
            )
          }
        >
          Copy URL
        </button>
        {storage.ready && (
          <>
            <button type="button" className={btnSecondary} disabled={progress != null} onClick={() => replaceRef.current?.click()}>
              {progress != null ? `Replacing… ${Math.round(progress * 100)}%` : "Replace file"}
            </button>
            <input
              ref={replaceRef}
              type="file"
              className="sr-only"
              tabIndex={-1}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setProgress(0);
                try {
                  const next = await uploadFile(file, storage, setProgress, item.id);
                  onChanged(next);
                  setMessage({ ok: true, text: "File replaced everywhere it is used." });
                } catch (err) {
                  setMessage({ ok: false, text: (err as Error).message });
                } finally {
                  setProgress(null);
                }
              }}
            />
          </>
        )}
      </div>
      <div className="border-t border-ink-700 pt-3 text-sm">
        <p className="mb-1 text-mist-300">Used in</p>
        {usage.length ? (
          <ul className="list-disc space-y-0.5 pl-5 text-xs text-mist-200">
            {usage.map((u) => (
              <li key={u.id}>
                {u.title}
                {u.deleted && <span className="text-mist-400"> (in trash)</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-mist-400">Not used anywhere.</p>
        )}
        <button
          type="button"
          className={`${btnDanger} mt-3`}
          disabled={pending || usage.length > 0}
          title={usage.length ? "Remove it from the places listed above first" : undefined}
          onClick={() => {
            if (!window.confirm("Delete this file permanently?")) return;
            start(async () => {
              const r = await removeMedia(item.id);
              if (r.ok) onDeleted();
              else setMessage({ ok: false, text: r.error });
            });
          }}
        >
          Delete file
        </button>
      </div>
    </div>
  );
}
