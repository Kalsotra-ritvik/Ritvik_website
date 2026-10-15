/**
 * Upload validation by content, not by file name.
 *
 * Binary formats are identified from their magic bytes (file-type); text-based
 * structure files (PDB, mmCIF, glTF JSON) are checked for their record syntax.
 * SVG and everything not listed here is rejected.
 */
import { fileTypeFromBuffer } from "file-type";

export type MediaKind = "image" | "video" | "pdf" | "model";

export interface AcceptedType {
  mime: string;
  ext: string;
  kind: MediaKind;
  maxBytes: number;
}

const MB = 1024 * 1024;

export const ACCEPTED: Record<string, AcceptedType> = {
  "image/png": { mime: "image/png", ext: "png", kind: "image", maxBytes: 10 * MB },
  "image/jpeg": { mime: "image/jpeg", ext: "jpg", kind: "image", maxBytes: 10 * MB },
  "image/webp": { mime: "image/webp", ext: "webp", kind: "image", maxBytes: 10 * MB },
  "image/avif": { mime: "image/avif", ext: "avif", kind: "image", maxBytes: 10 * MB },
  "image/gif": { mime: "image/gif", ext: "gif", kind: "image", maxBytes: 10 * MB },
  "video/mp4": { mime: "video/mp4", ext: "mp4", kind: "video", maxBytes: 100 * MB },
  "video/webm": { mime: "video/webm", ext: "webm", kind: "video", maxBytes: 100 * MB },
  "application/pdf": { mime: "application/pdf", ext: "pdf", kind: "pdf", maxBytes: 20 * MB },
  "model/gltf-binary": { mime: "model/gltf-binary", ext: "glb", kind: "model", maxBytes: 50 * MB },
  "model/gltf+json": { mime: "model/gltf+json", ext: "gltf", kind: "model", maxBytes: 20 * MB },
  "chemical/x-pdb": { mime: "chemical/x-pdb", ext: "pdb", kind: "model", maxBytes: 50 * MB },
  "chemical/x-mmcif": { mime: "chemical/x-mmcif", ext: "cif", kind: "model", maxBytes: 50 * MB },
};

/** Declared MIME types the browser may send for each accepted type (used before direct uploads). */
export const DECLARED_ALIASES: Record<string, string> = {
  "image/jpg": "image/jpeg",
  "model/gltf+json": "model/gltf+json",
  "application/octet-stream": "",
  "chemical/x-pdb": "chemical/x-pdb",
  "chemical/x-cif": "chemical/x-mmcif",
  "chemical/x-mmcif": "chemical/x-mmcif",
  "text/plain": "",
  "application/json": "",
};

export const SNIFF_BYTES = 64 * 1024;

export type SniffResult = { ok: true; type: AcceptedType } | { ok: false; reason: string };

function looksLikeText(bytes: Uint8Array) {
  const n = Math.min(bytes.length, 8192);
  for (let i = 0; i < n; i++) {
    const b = bytes[i];
    if (b === 0) return false;
    if (b < 9 || (b > 13 && b < 32)) return false;
  }
  return true;
}

/**
 * Identify a file from its leading bytes. `head` should contain at least the
 * first SNIFF_BYTES of the file (or the whole file when smaller).
 */
export async function sniff(head: Uint8Array, fileName = ""): Promise<SniffResult> {
  if (head.length === 0) return { ok: false, reason: "The file is empty." };
  const detected = await fileTypeFromBuffer(head);
  if (detected) {
    if (detected.mime === "image/svg+xml") return { ok: false, reason: "SVG files are not accepted." };
    const accepted = ACCEPTED[detected.mime];
    if (accepted) return { ok: true, type: accepted };
    return { ok: false, reason: `This file type (${detected.mime}) is not supported.` };
  }
  if (!looksLikeText(head)) return { ok: false, reason: "This file type is not supported." };
  const text = new TextDecoder("utf-8", { fatal: false }).decode(head);
  if (/<svg[\s>]/i.test(text) || /<\?xml/i.test(text.slice(0, 200))) return { ok: false, reason: "SVG and XML files are not accepted." };
  if (/^data_\S+/m.test(text) && /_atom_site\.|_entry\.id/.test(text)) return { ok: true, type: ACCEPTED["chemical/x-mmcif"] };
  if (/^(HEADER|ATOM {2}|HETATM|CRYST1|COMPND|MODEL )/m.test(text)) return { ok: true, type: ACCEPTED["chemical/x-pdb"] };
  const trimmed = text.trimStart();
  if (trimmed.startsWith("{") && /"asset"\s*:\s*\{[^}]*"version"/.test(text) && /\.gltf$/i.test(fileName)) {
    return { ok: true, type: ACCEPTED["model/gltf+json"] };
  }
  return { ok: false, reason: "This file type is not supported. Use PNG, JPEG, WebP, AVIF, GIF, MP4, WebM, PDF, GLB, glTF, PDB or mmCIF." };
}

/** Full-file check used for glTF JSON, which must parse completely. */
export function validateGltfJson(bytes: Uint8Array): boolean {
  try {
    const json = JSON.parse(new TextDecoder().decode(bytes));
    return typeof json?.asset?.version === "string";
  } catch {
    return false;
  }
}

export function safeBaseName(name: string): string {
  const base = name.replace(/\.[^.]*$/, "").normalize("NFKD");
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "file";
}

export function storageKeyFor(id: string, originalName: string, ext: string, now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}/${m}/${id}-${safeBaseName(originalName)}.${ext}`;
}

/** Read width/height from PNG, JPEG, GIF or WebP headers (best effort). */
export function imageSize(bytes: Uint8Array, mime: string): { width: number; height: number } | null {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  try {
    if (mime === "image/png" && bytes.length > 24) return { width: dv.getUint32(16), height: dv.getUint32(20) };
    if (mime === "image/gif" && bytes.length > 10) return { width: dv.getUint16(6, true), height: dv.getUint16(8, true) };
    if (mime === "image/webp" && bytes.length > 30) {
      const chunk = String.fromCharCode(...bytes.slice(12, 16));
      if (chunk === "VP8X") return { width: 1 + (dv.getUint32(24, true) & 0xffffff), height: 1 + (dv.getUint32(27, true) & 0xffffff) };
      if (chunk === "VP8 ") return { width: dv.getUint16(26, true) & 0x3fff, height: dv.getUint16(28, true) & 0x3fff };
      if (chunk === "VP8L") {
        const b = dv.getUint32(21, true);
        return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
      }
    }
    if (mime === "image/jpeg") {
      let i = 2;
      while (i + 9 < bytes.length) {
        if (bytes[i] !== 0xff) return null;
        const marker = bytes[i + 1];
        const len = dv.getUint16(i + 2);
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { height: dv.getUint16(i + 5), width: dv.getUint16(i + 7) };
        }
        i += 2 + len;
      }
    }
  } catch {
    return null;
  }
  return null;
}
