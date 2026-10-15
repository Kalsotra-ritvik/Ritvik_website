/**
 * Content data-access layer (server only).
 *
 * Every mutation:
 *  - validates the document with the collection's Zod schema,
 *  - checks the caller's expected `version` (rejects conflicting edits),
 *  - writes a revision row so the previous state stays recoverable.
 * Callers (Server Actions) must authorise the admin before calling these.
 */
import "server-only";
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { getDb, isDatabaseConfigured, type Database } from "@/lib/db/client";
import { contentEntries, contentRevisions, media, type ContentEntry } from "@/lib/db/schema";
import { publicUrlFor } from "@/lib/storage/urls";
import { LIST_TEMPLATES, SINGLETON_DEFAULTS, defaultContent } from "./defaults";
import {
  LISTS,
  SINGLETONS,
  isSingleton,
  schemaFor,
  type CollectionName,
  type ListName,
  type SingletonName,
  type SiteContent,
} from "./schema";

export interface Actor {
  id: string;
  loginId: string;
}

export interface FieldIssue {
  path: string;
  message: string;
}

export class ContentError extends Error {
  constructor(
    public code: "conflict" | "not_found" | "invalid" | "forbidden",
    message: string,
    public issues: FieldIssue[] = [],
  ) {
    super(message);
    this.name = "ContentError";
  }
}

export type EntryStatus = "draft" | "published" | "changed" | "unpublished";

export function statusOf(row: Pick<ContentEntry, "publishedData" | "everPublished" | "draftRev" | "publishedRev">): EntryStatus {
  if (row.publishedData == null) return row.everPublished ? "unpublished" : "draft";
  return row.draftRev === row.publishedRev ? "published" : "changed";
}

export const STATUS_LABEL: Record<EntryStatus, string> = {
  draft: "Draft — never published",
  published: "Published",
  changed: "Unpublished changes",
  unpublished: "Unpublished",
};

/** A short human-readable title for any entry. */
export function labelFor(collection: string, data: unknown): string {
  if (isSingleton(collection)) return SINGLETON_TITLES[collection as SingletonName];
  const d = (data ?? {}) as Record<string, unknown>;
  const pick = ["title", "degree", "role", "label", "name"].map((k) => d[k]).find((v) => typeof v === "string" && v.trim());
  if (typeof pick === "string") {
    if (collection === "education" && typeof d.institution === "string") return `${pick} — ${d.institution}`;
    if (collection === "experience" && typeof d.organisation === "string") return `${pick} — ${d.organisation}`;
    return pick;
  }
  return isSingleton(collection) ? SINGLETON_TITLES[collection as SingletonName] : "Untitled";
}

export const SINGLETON_TITLES: Record<SingletonName, string> = {
  profile: "Profile & hero",
  science: "Scientific text",
  labels: "Scene annotations",
  figures: "Transcriptomics figures",
  sections: "Navigation & sections",
  site: "Site, contact & SEO",
  visual: "Visual settings",
};

export const LIST_TITLES: Record<ListName, string> = {
  education: "Education",
  experience: "Experience",
  project: "Projects",
  skillGroup: "Skills",
  credential: "Publications & credentials",
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validate(collection: CollectionName, data: unknown) {
  const result = schemaFor(collection).safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    throw new ContentError("invalid", "Some fields need attention.", issues);
  }
  return result.data as Record<string, unknown>;
}

/** Fill keys missing from older stored documents with current defaults. */
export function mergeDefaults<T>(base: T, data: unknown): T {
  if (Array.isArray(base) || base === null || typeof base !== "object") return (data === undefined ? base : data) as T;
  if (data === null || typeof data !== "object" || Array.isArray(data)) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    out[k] = k in out ? mergeDefaults(out[k], v) : v;
  }
  return out as T;
}

function baseFor(collection: CollectionName): unknown {
  return isSingleton(collection) ? SINGLETON_DEFAULTS[collection] : LIST_TEMPLATES[collection as ListName];
}

function keyFor(collection: CollectionName, data: Record<string, unknown>, existing?: string) {
  if (isSingleton(collection)) return collection;
  if (collection === "project") return String(data.slug);
  return existing ?? randomUUID().slice(0, 12);
}

function isUniqueViolation(err: unknown) {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}

// ---------------------------------------------------------------------------
// Reads (admin)
// ---------------------------------------------------------------------------

export interface EntrySummary {
  id: string;
  collection: CollectionName;
  key: string;
  title: string;
  status: EntryStatus;
  version: number;
  visible: boolean;
  order: number;
  updatedAt: Date;
  publishedAt: Date | null;
}

function summarise(row: ContentEntry): EntrySummary {
  const d = (row.draftData ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    collection: row.collection as CollectionName,
    key: row.key,
    title: labelFor(row.collection, d),
    status: statusOf(row),
    version: row.version,
    visible: d.visible !== false,
    order: typeof d.order === "number" ? d.order : 0,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt,
  };
}

export async function listEntries(collection: ListName): Promise<EntrySummary[]> {
  const rows = await getDb()
    .select()
    .from(contentEntries)
    .where(and(eq(contentEntries.collection, collection), isNull(contentEntries.deletedAt)));
  return rows.map(summarise).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

export async function getEntry(id: string) {
  const rows = await getDb().select().from(contentEntries).where(eq(contentEntries.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getSingletonEntry(name: SingletonName) {
  const rows = await getDb()
    .select()
    .from(contentEntries)
    .where(and(eq(contentEntries.collection, name), isNull(contentEntries.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

/** Draft document for editing: stored draft merged with current defaults, or the defaults. */
export function editableData(collection: CollectionName, row: ContentEntry | null): Record<string, unknown> {
  const base = baseFor(collection);
  return mergeDefaults(structuredClone(base), row?.draftData ?? base) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

async function writeRevision(tx: Database, row: ContentEntry, action: string, actor: Actor) {
  await tx.insert(contentRevisions).values({
    entryId: row.id,
    collection: row.collection,
    key: row.key,
    action,
    data: row.draftData,
    published: row.publishedData != null,
    version: row.version,
    adminId: actor.id,
    adminLogin: actor.loginId,
  });
}

async function lockedUpdate(
  tx: Database,
  id: string,
  expectedVersion: number,
  set: Partial<typeof contentEntries.$inferInsert> & Record<string, unknown>,
): Promise<ContentEntry> {
  const rows = await tx
    .update(contentEntries)
    .set({ ...set, version: sql`${contentEntries.version} + 1`, updatedAt: new Date() })
    .where(and(eq(contentEntries.id, id), eq(contentEntries.version, expectedVersion)))
    .returning();
  if (rows[0]) return rows[0];
  const current = await tx.select({ id: contentEntries.id }).from(contentEntries).where(eq(contentEntries.id, id));
  if (!current[0]) throw new ContentError("not_found", "This item no longer exists.");
  throw new ContentError("conflict", "This item was changed somewhere else since you opened it. Reload to see the latest version, then reapply your edits.");
}

export async function saveEntry(
  input: { collection: CollectionName; id: string | null; data: unknown; expectedVersion: number | null },
  actor: Actor,
): Promise<ContentEntry> {
  const { collection } = input;
  const data = validate(collection, input.data);
  const db = getDb();
  try {
    return await db.transaction(async (tx) => {
      if (input.id) {
        if (input.expectedVersion == null) throw new ContentError("invalid", "Missing version.");
        const existing = (await tx.select().from(contentEntries).where(eq(contentEntries.id, input.id)))[0];
        if (!existing || existing.collection !== collection) throw new ContentError("not_found", "This item no longer exists.");
        if (existing.deletedAt) throw new ContentError("invalid", "Restore this item from the trash before editing it.");
        const row = await lockedUpdate(tx as unknown as Database, input.id, input.expectedVersion, {
          draftData: data,
          key: keyFor(collection, data, existing.key),
          draftRev: sql`${contentEntries.draftRev} + 1` as unknown as number,
          updatedBy: actor.id,
        });
        await writeRevision(tx as unknown as Database, row, "save", actor);
        return row;
      }
      if (isSingleton(collection)) {
        const exists = await tx
          .select({ id: contentEntries.id })
          .from(contentEntries)
          .where(and(eq(contentEntries.collection, collection), isNull(contentEntries.deletedAt)));
        if (exists[0]) throw new ContentError("conflict", "This section was created somewhere else. Reload to edit the latest version.");
      } else {
        const orders = await tx
          .select({ max: sql<number>`coalesce(max((${contentEntries.draftData}->>'order')::int), -1)` })
          .from(contentEntries)
          .where(and(eq(contentEntries.collection, collection), isNull(contentEntries.deletedAt)));
        data.order = Number(orders[0]?.max ?? -1) + 1;
      }
      const inserted = await tx
        .insert(contentEntries)
        .values({ collection, key: keyFor(collection, data), draftData: data, updatedBy: actor.id })
        .returning();
      await writeRevision(tx as unknown as Database, inserted[0], "create", actor);
      return inserted[0];
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ContentError("invalid", "Another item already uses this identifier.", [
        { path: collection === "project" ? "slug" : "", message: "Already used by another item." },
      ]);
    }
    throw err;
  }
}

async function mutate(id: string, expectedVersion: number, actor: Actor, action: string, build: (row: ContentEntry) => Record<string, unknown>) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const existing = (await tx.select().from(contentEntries).where(eq(contentEntries.id, id)))[0];
    if (!existing) throw new ContentError("not_found", "This item no longer exists.");
    const row = await lockedUpdate(tx as unknown as Database, id, expectedVersion, { ...build(existing), updatedBy: actor.id });
    await writeRevision(tx as unknown as Database, row, action, actor);
    return row;
  });
}

export async function publishEntry(id: string, expectedVersion: number, actor: Actor) {
  return mutate(id, expectedVersion, actor, "publish", (row) => {
    if (row.deletedAt) throw new ContentError("invalid", "Restore this item from the trash before publishing it.");
    // Re-validate: the schema may have changed since the draft was saved.
    const data = validate(row.collection as CollectionName, mergeDefaults(structuredClone(baseFor(row.collection as CollectionName)), row.draftData));
    return { draftData: data, publishedData: data, publishedRev: row.draftRev, everPublished: true, publishedAt: new Date() };
  });
}

export async function unpublishEntry(id: string, expectedVersion: number, actor: Actor) {
  return mutate(id, expectedVersion, actor, "unpublish", (row) => {
    if (isSingleton(row.collection)) throw new ContentError("forbidden", "Site-wide sections can't be unpublished; edit and publish them instead.");
    return { publishedData: null, publishedRev: null };
  });
}

export async function discardDraft(id: string, expectedVersion: number, actor: Actor) {
  return mutate(id, expectedVersion, actor, "discard", (row) => {
    if (row.publishedData == null) throw new ContentError("invalid", "There is no published version to go back to.");
    return { draftData: row.publishedData, draftRev: row.publishedRev ?? row.draftRev };
  });
}

export async function deleteEntry(id: string, expectedVersion: number, actor: Actor) {
  return mutate(id, expectedVersion, actor, "delete", (row) => {
    if (isSingleton(row.collection)) throw new ContentError("forbidden", "Site-wide sections can't be deleted.");
    return { deletedAt: new Date() };
  });
}

export async function restoreEntry(id: string, actor: Actor) {
  const row = await getEntry(id);
  if (!row || !row.deletedAt) throw new ContentError("not_found", "This item is not in the trash.");
  try {
    return await mutate(id, row.version, actor, "restore", () => ({ deletedAt: null }));
  } catch (err) {
    if (isUniqueViolation(err)) {
      const key = `${row.key}-restored-${randomUUID().slice(0, 4)}`;
      const draft = { ...(row.draftData as Record<string, unknown>) };
      if (row.collection === "project") draft.slug = key;
      return mutate(id, row.version, actor, "restore", () => ({ deletedAt: null, key, draftData: draft }));
    }
    throw err;
  }
}

export async function duplicateEntry(id: string, actor: Actor) {
  const row = await getEntry(id);
  if (!row || isSingleton(row.collection)) throw new ContentError("not_found", "This item can't be duplicated.");
  const draft = { ...(row.draftData as Record<string, unknown>) };
  if (typeof draft.title === "string") draft.title = `${draft.title} (copy)`;
  else if (typeof draft.degree === "string") draft.degree = `${draft.degree} (copy)`;
  else if (typeof draft.role === "string") draft.role = `${draft.role} (copy)`;
  else if (typeof draft.label === "string") draft.label = `${draft.label} (copy)`;
  if (row.collection === "project") draft.slug = `${String(draft.slug).slice(0, 60)}-copy-${randomUUID().slice(0, 4)}`;
  return saveEntry({ collection: row.collection as CollectionName, id: null, data: draft, expectedVersion: null }, actor);
}

/** Move a list item up or down. Reordering changes drafts; publish to apply it. */
export async function moveEntry(id: string, direction: -1 | 1, actor: Actor) {
  const row = await getEntry(id);
  if (!row || isSingleton(row.collection)) throw new ContentError("not_found", "This item can't be reordered.");
  const items = await listEntries(row.collection as ListName);
  const index = items.findIndex((i) => i.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= items.length) return;
  const order = items.map((i) => i.id);
  [order[index], order[target]] = [order[target], order[index]];
  const db = getDb();
  await db.transaction(async (tx) => {
    for (let i = 0; i < order.length; i++) {
      const current = (await tx.select().from(contentEntries).where(eq(contentEntries.id, order[i])))[0];
      const draft = current.draftData as Record<string, unknown>;
      if (draft.order === i) continue;
      const updated = await lockedUpdate(tx as unknown as Database, current.id, current.version, {
        draftData: { ...draft, order: i },
        draftRev: sql`${contentEntries.draftRev} + 1` as unknown as number,
        updatedBy: actor.id,
      });
      await writeRevision(tx as unknown as Database, updated, "reorder", actor);
    }
  });
}

export async function pendingEntries() {
  const rows = await getDb().select().from(contentEntries).where(isNull(contentEntries.deletedAt));
  return rows.filter((r) => statusOf(r) === "changed" || statusOf(r) === "draft").map(summarise);
}

/** Publish every entry with unpublished changes (including new drafts). */
export async function publishAll(actor: Actor) {
  const pending = await pendingEntries();
  for (const p of pending) await publishEntry(p.id, p.version, actor);
  return pending.length;
}

// ---------------------------------------------------------------------------
// Revisions and trash
// ---------------------------------------------------------------------------

export async function listRevisions(opts: { entryId?: string; limit?: number } = {}) {
  const db = getDb();
  const q = db.select().from(contentRevisions).orderBy(desc(contentRevisions.id)).limit(opts.limit ?? 50);
  const rows = opts.entryId ? await q.where(eq(contentRevisions.entryId, opts.entryId)) : await q;
  return rows.map((r) => ({ ...r, title: labelFor(r.collection, r.data) }));
}

/** Copy an earlier revision into the draft (never directly to the public site). */
export async function restoreRevision(revisionId: number, actor: Actor) {
  const db = getDb();
  const rev = (await db.select().from(contentRevisions).where(eq(contentRevisions.id, revisionId)))[0];
  if (!rev) throw new ContentError("not_found", "That revision no longer exists.");
  const entry = await getEntry(rev.entryId);
  if (!entry) throw new ContentError("not_found", "The item for this revision no longer exists.");
  const collection = entry.collection as CollectionName;
  const data = validate(collection, mergeDefaults(structuredClone(baseFor(collection)), rev.data));
  return mutate(entry.id, entry.version, actor, "revert", () => ({
    draftData: data,
    deletedAt: null,
    draftRev: sql`${contentEntries.draftRev} + 1`,
  }));
}

export async function listTrash() {
  const rows = await getDb().select().from(contentEntries).where(isNotNull(contentEntries.deletedAt)).orderBy(desc(contentEntries.deletedAt));
  return rows.map((r) => ({ ...summarise(r), deletedAt: r.deletedAt! }));
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function dashboardSummary() {
  const db = getDb();
  const rows = await db.select().from(contentEntries).where(isNull(contentEntries.deletedAt));
  const counts: Record<string, { total: number; visible: number }> = {};
  for (const name of Object.keys(LISTS)) counts[name] = { total: 0, visible: 0 };
  let skills = 0;
  for (const r of rows) {
    if (isSingleton(r.collection)) continue;
    const d = r.draftData as Record<string, unknown>;
    counts[r.collection] ??= { total: 0, visible: 0 };
    counts[r.collection].total++;
    if (d.visible !== false) counts[r.collection].visible++;
    if (r.collection === "skillGroup" && Array.isArray(d.items)) skills += d.items.length;
  }
  const pending = rows.filter((r) => ["changed", "draft"].includes(statusOf(r))).map(summarise);
  const recent = [...rows].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 8).map(summarise);
  const lastPublished = rows.reduce<Date | null>((m, r) => (r.publishedAt && (!m || r.publishedAt > m) ? r.publishedAt : m), null);
  const singletonsMissing = (Object.keys(SINGLETONS) as SingletonName[]).filter((s) => !rows.some((r) => r.collection === s));
  const mediaCount = (await db.select({ n: sql<number>`count(*)` }).from(media))[0]?.n ?? 0;
  return { counts, skills, pending, recent, lastPublished, singletonsMissing, mediaCount: Number(mediaCount), seeded: rows.length > 0 };
}

// ---------------------------------------------------------------------------
// Media references
// ---------------------------------------------------------------------------

export async function mediaReferences(mediaId: string) {
  const rows = await getDb()
    .select()
    .from(contentEntries)
    .where(
      sql`(${contentEntries.draftData}::text like ${"%" + mediaId + "%"} or coalesce(${contentEntries.publishedData}::text, '') like ${"%" + mediaId + "%"})`,
    );
  return rows.map((r) => ({ id: r.id, collection: r.collection, title: labelFor(r.collection, r.draftData), deleted: r.deletedAt != null }));
}

// ---------------------------------------------------------------------------
// Public / preview assembly
// ---------------------------------------------------------------------------

export interface LoadedContent {
  content: SiteContent;
  source: "database" | "defaults";
  error?: string;
}

const UUID_IN_JSON = /"mediaId":"([0-9a-f-]{36})"/g;

export async function loadContent(mode: "published" | "draft"): Promise<LoadedContent> {
  const fallback = defaultContent();
  if (!isDatabaseConfigured()) return { content: fallback, source: "defaults", error: "DATABASE_URL is not set." };
  try {
    const db = getDb();
    const rows = await db.select().from(contentEntries).where(isNull(contentEntries.deletedAt));
    if (rows.length === 0) return { content: fallback, source: "defaults", error: "The database has no content yet. Run npm run db:seed." };
    const content = defaultContent();
    const pick = (r: ContentEntry) => (mode === "published" ? r.publishedData : r.draftData);

    for (const name of Object.keys(SINGLETONS) as SingletonName[]) {
      const row = rows.find((r) => r.collection === name);
      const data = row ? pick(row) : null;
      if (data == null) continue;
      const parsed = SINGLETONS[name].safeParse(mergeDefaults(structuredClone(SINGLETON_DEFAULTS[name]), data));
      if (parsed.success) (content as unknown as Record<string, unknown>)[name] = parsed.data;
      else console.error(`Stored ${name} failed validation; using defaults.`, parsed.error.issues.slice(0, 3));
    }

    const lists: [ListName, keyof SiteContent][] = [
      ["education", "education"],
      ["experience", "experience"],
      ["project", "projects"],
      ["skillGroup", "skillGroups"],
      ["credential", "credentials"],
    ];
    for (const [name, field] of lists) {
      const items: { order: number; visible: boolean }[] = [];
      for (const r of rows.filter((x) => x.collection === name)) {
        const data = pick(r);
        if (data == null) continue;
        const parsed = LISTS[name].safeParse(mergeDefaults(structuredClone(LIST_TEMPLATES[name]), data));
        if (parsed.success) items.push(parsed.data as { order: number; visible: boolean });
        else console.error(`Stored ${name} ${r.key} failed validation; skipped.`);
      }
      (content as unknown as Record<string, unknown>)[field] = items.filter((i) => i.visible).sort((a, b) => a.order - b.order);
    }

    const ids = new Set<string>();
    for (const m of JSON.stringify(content).matchAll(UUID_IN_JSON)) ids.add(m[1]);
    if (ids.size) {
      const found = await db.select().from(media).where(inArray(media.id, [...ids]));
      for (const m of found) {
        if (m.status !== "ready") continue;
        const url = publicUrlFor(m.driver, m.storageKey);
        if (url) content.media[m.id] = { url, mime: m.mime, alt: m.alt };
      }
    }
    return { content, source: "database" };
  } catch (err) {
    console.error("Content database unavailable; serving defaults.", err);
    return { content: fallback, source: "defaults", error: "The content database could not be reached." };
  }
}
