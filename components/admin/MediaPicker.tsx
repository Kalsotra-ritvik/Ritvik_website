"use client";

import { useEffect, useRef, useState } from "react";
import type { MediaAccept } from "@/lib/admin/forms";
import { btnGhost, btnPrimary, formatBytes } from "./ui";
import { uploadFile, type StorageInfo, type UploadedMedia } from "./upload";

export type MediaItem = UploadedMedia;

let cache: Promise<{ items: MediaItem[]; storage: StorageInfo }> | null = null;

export function fetchLibrary(force = false) {
  if (force || !cache) {
    cache = fetch("/api/admin/media", { cache: "no-store" }).then(async (r) => {
      if (!r.ok) throw new Error("Could not load the media library.");
      return r.json();
    });
    cache.catch(() => (cache = null));
  }
  return cache;
}

export async function loadMedia() {
  return (await fetchLibrary()).items;
}

const ACCEPT_ATTR: Record<MediaAccept, string> = {
  image: "image/png,image/jpeg,image/webp,image/avif,image/gif",
  video: "video/mp4,video/webm",
  pdf: "application/pdf",
  model: ".glb,.gltf,.pdb,.cif",
  any: "",
};

export default function MediaPicker({ accept, onPick, onClose }: { accept: MediaAccept; onPick: (m: MediaItem) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    ref.current?.showModal();
    fetchLibrary(true)
      .then((r) => {
        setItems(r.items);
        setStorage(r.storage);
      })
      .catch((e) => setError(e.message));
  }, []);

  const shown = (items ?? []).filter(
    (m) => (accept === "any" || m.kind === accept) && (!query || `${m.title ?? ""} ${m.originalName}`.toLowerCase().includes(query.toLowerCase())),
  );

  async function onFile(file: File | undefined) {
    if (!file || !storage) return;
    setError("");
    setProgress(0);
    try {
      const item = await uploadFile(file, storage, setProgress);
      cache = null;
      if (accept !== "any" && item.kind !== accept) {
        setItems((list) => [item, ...(list ?? [])]);
        setError(`Uploaded, but this field needs a ${accept} file.`);
      } else onPick(item);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProgress(null);
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(56rem,calc(100vw-1.5rem))] rounded-2xl border border-ink-600 bg-ink-900 p-0 text-mist-100 backdrop:bg-black/70"
      aria-label="Choose media"
    >
      <div className="flex max-h-[85dvh] flex-col">
        <div className="flex flex-wrap items-center gap-3 border-b border-ink-700 p-4">
          <h2 className="mr-auto font-display text-2xl">Choose {accept === "any" ? "a file" : `a ${accept === "pdf" ? "PDF" : accept}`}</h2>
          <input
            className="w-full rounded-lg border border-ink-600 bg-ink-850 px-3 py-2 text-sm sm:w-56"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search media"
          />
          <button type="button" className={btnGhost} onClick={() => ref.current?.close()}>
            Close
          </button>
        </div>
        <div className="overflow-y-auto p-4">
          {storage && !storage.ready && <p className="mb-3 rounded-lg border border-amber-300/40 bg-amber-300/10 p-3 text-sm">{storage.message}</p>}
          {error && (
            <p role="alert" className="mb-3 rounded-lg border border-coral-400/50 bg-coral-400/10 p-3 text-sm">
              {error}
            </p>
          )}
          {storage?.ready && (
            <label className={`${btnPrimary} mb-4 cursor-pointer`}>
              {progress != null ? `Uploading… ${Math.round(progress * 100)}%` : "Upload new file"}
              <input type="file" className="sr-only" accept={ACCEPT_ATTR[accept]} disabled={progress != null} onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
          )}
          {!items && !error && <p className="text-sm text-mist-400">Loading…</p>}
          {items && shown.length === 0 && <p className="text-sm text-mist-400">No matching files in the library yet.</p>}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {shown.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onPick(m)}
                  className="group w-full overflow-hidden rounded-xl border border-ink-700 bg-ink-850 text-left hover:border-amber-300 focus-visible:border-amber-300"
                >
                  <div className="flex aspect-[4/3] items-center justify-center bg-ink-800">
                    {m.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail of uploaded media
                      <img src={m.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <span className="font-mono text-xs text-mist-300">{m.kind.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="truncate text-xs text-mist-100">{m.title || m.originalName}</p>
                    <p className="text-[11px] text-mist-400">{formatBytes(m.size)}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </dialog>
  );
}
