/**
 * Media library (server only). Files live in the configured storage adapter;
 * only metadata is stored in PostgreSQL (never file contents).
 */
import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, lt } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { contentEntries, media, type MediaRow } from "@/lib/db/schema";
import { labelFor } from "@/lib/content/service";
import { getStorage, publicUrlFor, type StorageAdapter } from "@/lib/storage";
import { ACCEPTED, DECLARED_ALIASES, SNIFF_BYTES, imageSize, sniff, storageKeyFor, validateGltfJson, type AcceptedType } from "./validate";

export class MediaError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface MediaDto {
  id: string;
  url: string;
  mime: string;
  kind: string;
  originalName: string;
  title: string | null;
  alt: string | null;
  width: number | null;
  height: number | null;
  size: number;
  createdAt: string;
}

export function toDto(row: MediaRow): MediaDto {
  return {
    id: row.id,
    url: publicUrlFor(row.driver, row.storageKey),
    mime: row.mime,
    kind: row.kind,
    originalName: row.originalName,
    title: row.title,
    alt: row.alt,
    width: row.width,
    height: row.height,
    size: row.size,
    createdAt: row.createdAt.toISOString(),
  };
}

const PENDING_TTL_MS = 60 * 60 * 1000;

/** Remove direct uploads that were started but never verified. */
async function purgeStalePending() {
  const db = getDb();
  const stale = await db
    .select()
    .from(media)
    .where(and(eq(media.status, "pending"), lt(media.createdAt, new Date(Date.now() - PENDING_TTL_MS))));
  if (!stale.length) return;
  let storage: StorageAdapter | null = null;
  try {
    storage = getStorage();
  } catch {
    storage = null;
  }
  for (const row of stale) {
    if (storage && storage.driver === row.driver) await storage.remove(row.storageKey).catch(() => undefined);
    await db.delete(media).where(eq(media.id, row.id));
  }
}

export async function listMedia(): Promise<MediaDto[]> {
  await purgeStalePending().catch((err) => console.error("Pending media cleanup failed:", err));
  const rows = await getDb().select().from(media).where(eq(media.status, "ready")).orderBy(desc(media.createdAt));
  return rows.map(toDto);
}

/** Content entries (drafts, published versions and trash) that point at each media id. */
export async function mediaUsage(): Promise<Record<string, { id: string; collection: string; title: string; deleted: boolean }[]>> {
  const rows = await getDb().select().from(contentEntries);
  const usage: Record<string, { id: string; collection: string; title: string; deleted: boolean }[]> = {};
  const re = /"mediaId":"([0-9a-f-]{36})"/g;
  for (const r of rows) {
    const text = JSON.stringify(r.draftData) + JSON.stringify(r.publishedData ?? null);
    const ids = new Set([...text.matchAll(re)].map((m) => m[1]));
    for (const id of ids) (usage[id] ??= []).push({ id: r.id, collection: r.collection, title: labelFor(r.collection, r.draftData), deleted: r.deletedAt != null });
  }
  return usage;
}

function checkSize(type: AcceptedType, size: number) {
  if (size > type.maxBytes) throw new MediaError(413, `This ${type.kind} is too large: the limit is ${Math.round(type.maxBytes / 1024 / 1024)} MB.`);
}

async function getReplaceTarget(replaceId: string | undefined, kind: string) {
  if (!replaceId) return null;
  const row = (await getDb().select().from(media).where(eq(media.id, replaceId)).limit(1))[0];
  if (!row || row.status !== "ready") throw new MediaError(404, "The file to replace no longer exists.");
  if (row.kind !== kind) throw new MediaError(400, `A ${row.kind} can only be replaced by another ${row.kind}, so the places that use it keep working.`);
  return row;
}

/**
 * Upload through the server (local storage, or R2 for files below the request limit).
 * Validates the actual bytes, stores the object, then records it.
 */
export async function createFromBytes(bytes: Uint8Array, originalName: string, adminId: string, replaceId?: string): Promise<MediaDto> {
  const storage = getStorage();
  if (bytes.length > storage.maxServerUpload) throw new MediaError(413, "This file is too large to upload through the server.");
  const sniffed = await sniff(bytes.subarray(0, SNIFF_BYTES), originalName);
  if (!sniffed.ok) throw new MediaError(415, sniffed.reason);
  const type = sniffed.type;
  checkSize(type, bytes.length);
  if (type.mime === "model/gltf+json" && !validateGltfJson(bytes)) throw new MediaError(415, "This glTF file is not valid JSON.");
  const target = await getReplaceTarget(replaceId, type.kind);

  const id = randomUUID();
  const key = storageKeyFor(id, originalName, type.ext);
  const dims = type.kind === "image" ? imageSize(bytes.subarray(0, SNIFF_BYTES), type.mime) : null;
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  await storage.put(key, bytes, type.mime);

  const fields = {
    driver: storage.driver,
    storageKey: key,
    originalName: originalName.slice(0, 200),
    mime: type.mime,
    kind: type.kind,
    size: bytes.length,
    sha256,
    width: dims?.width ?? null,
    height: dims?.height ?? null,
    status: "ready",
    uploadedBy: adminId,
  };
  try {
    if (target) {
      const [row] = await getDb()
        .update(media)
        .set({ ...fields, updatedAt: new Date() })
        .where(eq(media.id, target.id))
        .returning();
      if (target.driver === storage.driver) await storage.remove(target.storageKey).catch(() => undefined);
      return toDto(row);
    }
    const [row] = await getDb()
      .insert(media)
      .values({ id, ...fields })
      .returning();
    return toDto(row);
  } catch (err) {
    await storage.remove(key).catch(() => undefined);
    throw err;
  }
}

/** Start a direct browser → R2 upload. The object is verified in completeDirectUpload. */
export async function presignUpload(input: { name: string; size: number; type: string; replaceId?: string }, adminId: string) {
  const storage = getStorage();
  if (!storage.supportsDirectUpload || !storage.presignPut) throw new MediaError(400, "Direct uploads are not available with this storage.");
  const declared = DECLARED_ALIASES[input.type] ?? (ACCEPTED[input.type] ? input.type : null);
  if (declared === null) throw new MediaError(415, "This file type is not supported.");
  const ext = (input.name.match(/\.([a-z0-9]{1,6})$/i)?.[1] ?? "").toLowerCase();
  const type = declared ? ACCEPTED[declared] : Object.values(ACCEPTED).find((t) => t.ext === ext || (ext === "jpeg" && t.ext === "jpg"));
  if (!type) throw new MediaError(415, "This file type is not supported.");
  if (!Number.isInteger(input.size) || input.size <= 0) throw new MediaError(400, "Invalid file size.");
  checkSize(type, input.size);
  if (input.replaceId) await getReplaceTarget(input.replaceId, type.kind);

  const id = randomUUID();
  const key = storageKeyFor(id, input.name, type.ext);
  await getDb().insert(media).values({
    id,
    driver: storage.driver,
    storageKey: key,
    originalName: input.name.slice(0, 200),
    mime: type.mime,
    kind: type.kind,
    size: input.size,
    status: "pending",
    uploadedBy: adminId,
  });
  const signed = await storage.presignPut(key, type.mime);
  return { id, ...signed };
}

export async function completeDirectUpload(id: string, replaceId?: string): Promise<MediaDto> {
  const storage = getStorage();
  const db = getDb();
  const row = (await db.select().from(media).where(eq(media.id, id)).limit(1))[0];
  if (!row || row.status !== "pending") throw new MediaError(404, "This upload has expired. Upload the file again.");
  const fail = async (status: number, message: string): Promise<never> => {
    await storage.remove(row.storageKey).catch(() => undefined);
    await db.delete(media).where(eq(media.id, id));
    throw new MediaError(status, message);
  };
  const size = await storage.size(row.storageKey);
  if (size == null) return fail(400, "The file did not reach storage. Upload it again.");
  if (size !== row.size) return fail(400, "The stored file does not match the selected file.");
  const head = await storage.readStart(row.storageKey, Math.min(size, SNIFF_BYTES));
  const sniffed = await sniff(head, row.originalName);
  if (!sniffed.ok) return fail(415, sniffed.reason);
  if (sniffed.type.mime !== row.mime) return fail(415, "The file's contents don't match its type.");
  try {
    checkSize(sniffed.type, size);
  } catch (err) {
    return fail(413, (err as Error).message);
  }
  if (row.mime === "model/gltf+json" && !validateGltfJson(await storage.readStart(row.storageKey, size))) return fail(415, "This glTF file is not valid JSON.");
  const dims = row.kind === "image" ? imageSize(head, row.mime) : null;

  if (replaceId) {
    let target: MediaRow | null;
    try {
      target = await getReplaceTarget(replaceId, row.kind);
    } catch (err) {
      return fail((err as MediaError).status ?? 400, (err as Error).message);
    }
    const [updated] = await db
      .update(media)
      .set({ driver: row.driver, storageKey: row.storageKey, originalName: row.originalName, mime: row.mime, kind: row.kind, size, sha256: null, width: dims?.width ?? null, height: dims?.height ?? null, updatedAt: new Date() })
      .where(eq(media.id, target!.id))
      .returning();
    await db.delete(media).where(eq(media.id, id));
    if (target!.driver === storage.driver) await storage.remove(target!.storageKey).catch(() => undefined);
    return toDto(updated);
  }
  const [ready] = await db
    .update(media)
    .set({ status: "ready", width: dims?.width ?? null, height: dims?.height ?? null, updatedAt: new Date() })
    .where(eq(media.id, id))
    .returning();
  return toDto(ready);
}

export async function updateMediaMeta(id: string, meta: { title: string; alt: string }) {
  const clean = (s: string, n: number) => s.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, n);
  const [row] = await getDb()
    .update(media)
    .set({ title: clean(meta.title, 200) || null, alt: clean(meta.alt, 300) || null, updatedAt: new Date() })
    .where(and(eq(media.id, id), eq(media.status, "ready")))
    .returning();
  if (!row) throw new MediaError(404, "This file no longer exists.");
  return toDto(row);
}

/** Delete a file only when no content (including drafts and the trash) refers to it. */
export async function deleteMedia(id: string) {
  const usage = (await mediaUsage())[id] ?? [];
  if (usage.length) {
    const names = usage.map((u) => `${u.title}${u.deleted ? " (in trash)" : ""}`).join(", ");
    throw new MediaError(409, `This file is still used by: ${names}. Remove it there first.`);
  }
  const db = getDb();
  const row = (await db.select().from(media).where(eq(media.id, id)).limit(1))[0];
  if (!row) throw new MediaError(404, "This file no longer exists.");
  const storage = getStorage();
  if (storage.driver === row.driver) await storage.remove(row.storageKey);
  await db.delete(media).where(eq(media.id, id));
}

export async function findLocalMedia(key: string) {
  return (
    await getDb()
      .select()
      .from(media)
      .where(and(eq(media.storageKey, key), eq(media.driver, "local"), eq(media.status, "ready")))
      .limit(1)
  )[0];
}
