"use client";

import { useEffect, useId, useState } from "react";
import type { Field, MediaAccept } from "@/lib/admin/forms";
import { btnGhost, btnSecondary, input } from "./ui";
import MediaPicker, { loadMedia, type MediaItem } from "./MediaPicker";

interface Asset {
  mediaId: string | null;
  src: string;
  alt: string;
}

export function acceptsKind(accept: MediaAccept, kind: string) {
  return accept === "any" || accept === kind;
}

export default function AssetField({
  field,
  value,
  onChange,
  error,
}: {
  field: Extract<Field, { kind: "asset" }>;
  value: unknown;
  onChange: (v: Asset) => void;
  error?: string;
}) {
  const id = useId();
  const asset: Asset = { mediaId: null, src: "", alt: "", ...((value as Partial<Asset>) ?? {}) };
  const [picking, setPicking] = useState(false);
  const [lookup, setLookup] = useState<{ id: string; item: MediaItem | null } | null>(null);
  const current = asset.mediaId && lookup?.id === asset.mediaId ? lookup : null;
  const item = current?.item ?? null;
  const missing = Boolean(current && !current.item);
  const setItem = (m: MediaItem) => setLookup({ id: m.id, item: m });

  useEffect(() => {
    let live = true;
    const id = asset.mediaId;
    if (!id) return;
    loadMedia()
      .then((list) => {
        if (live) setLookup({ id, item: list.find((m) => m.id === id) ?? null });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [asset.mediaId]);

  const url = item?.url ?? (asset.mediaId ? "" : asset.src);
  const kind = item?.kind ?? (/\.(png|jpe?g|webp|avif|gif)$/i.test(asset.src) ? "image" : /\.pdf$/i.test(asset.src) ? "pdf" : "");

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-mist-200">{field.label}</p>
      {field.help && <p className="-mt-1 mb-1.5 text-xs text-mist-400">{field.help}</p>}
      {error && <p className="mb-1.5 text-xs font-medium text-coral-400">{error}</p>}
      <div className="flex flex-col gap-3 rounded-xl border border-ink-700 bg-ink-900/60 p-3 sm:flex-row">
        <div className="flex h-24 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink-850 sm:w-32">
          {url && kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin preview of arbitrary uploaded media
            <img src={url} alt="" className="h-full w-full object-contain" />
          ) : url ? (
            <span className="px-2 text-center font-mono text-xs text-mist-300">{kind ? kind.toUpperCase() : "FILE"}</span>
          ) : (
            <span className="text-xs text-mist-400">None</span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="truncate text-sm text-mist-200">
            {item ? item.title || item.originalName : missing ? <span className="text-coral-400">The selected file was deleted from the library.</span> : asset.src ? <span className="font-mono text-xs">{asset.src}</span> : "No file selected"}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnSecondary} onClick={() => setPicking(true)}>
              {asset.mediaId || asset.src ? "Replace…" : "Choose from library…"}
            </button>
            {(asset.mediaId || asset.src) && (
              <button type="button" className={btnGhost} onClick={() => onChange({ mediaId: null, src: "", alt: "" })}>
                Remove
              </button>
            )}
          </div>
          {(asset.mediaId || asset.src) && (
            <div>
              <label htmlFor={`${id}-alt`} className="mb-1 block text-xs text-mist-300">
                Alternative text {kind === "image" ? "(describe the image for screen readers)" : "(optional)"}
              </label>
              <input
                id={`${id}-alt`}
                className={input}
                value={asset.alt}
                maxLength={300}
                placeholder={item?.alt ? `Library default: ${item.alt}` : ""}
                onChange={(e) => onChange({ ...asset, alt: e.target.value })}
              />
            </div>
          )}
          {field.allowStatic && !asset.mediaId && (
            <details className="text-xs text-mist-400">
              <summary className="cursor-pointer">Use a link instead</summary>
              <input
                className={`${input} mt-2 font-mono text-xs`}
                value={asset.src}
                placeholder="/path/on/this/site.pdf or https://…"
                onChange={(e) => onChange({ ...asset, src: e.target.value })}
                aria-label={`${field.label} link`}
              />
            </details>
          )}
        </div>
      </div>
      {picking && (
        <MediaPicker
          accept={field.accept}
          onClose={() => setPicking(false)}
          onPick={(m) => {
            onChange({ mediaId: m.id, src: "", alt: asset.alt || m.alt || "" });
            setItem(m);
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}
