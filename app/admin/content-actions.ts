"use server";

import { refresh, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { CONTENT_TAG } from "@/lib/content/public";
import { isCollection, isSingleton, type CollectionName } from "@/lib/content/schema";
import {
  ContentError,
  deleteEntry,
  discardDraft,
  duplicateEntry,
  getEntry,
  moveEntry,
  publishAll,
  publishEntry,
  restoreEntry,
  restoreRevision,
  saveEntry,
  statusOf,
  unpublishEntry,
  type Actor,
  type EntryStatus,
  type FieldIssue,
} from "@/lib/content/service";
import type { ContentEntry } from "@/lib/db/schema";

export type ActionResult =
  | { ok: true; message: string; entry?: { id: string; version: number; status: EntryStatus }; data?: Record<string, unknown> }
  | { ok: false; error: string; code?: string; issues?: FieldIssue[] };

async function actor(): Promise<Actor> {
  const session = await requireAdmin();
  return { id: session.admin.id, loginId: session.admin.loginId };
}

const brief = (row: ContentEntry) => ({ id: row.id, version: row.version, status: statusOf(row) });

async function run(fn: (a: Actor) => Promise<ActionResult>): Promise<ActionResult> {
  const a = await actor(); // redirects to the login page when the session has ended
  try {
    return await fn(a);
  } catch (err) {
    if (err instanceof ContentError) return { ok: false, error: err.message, code: err.code, issues: err.issues };
    console.error("Admin content action failed:", err);
    return { ok: false, error: "The change could not be saved because of a server error. Nothing was lost on your screen — try again." };
  }
}

/** The public site reads published content from a tagged cache; expire it after anything that changes what visitors see. */
function published() {
  updateTag(CONTENT_TAG);
}

function assertId(id: unknown): asserts id is string {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id)) throw new ContentError("invalid", "Invalid item.");
}
function assertVersion(v: unknown): asserts v is number {
  if (!Number.isInteger(v)) throw new ContentError("invalid", "Invalid version.");
}

export async function saveContent(input: {
  collection: string;
  id: string | null;
  version: number | null;
  data: unknown;
  publish?: boolean;
}): Promise<ActionResult> {
  return run(async (a) => {
    if (!isCollection(input.collection)) throw new ContentError("invalid", "Unknown section.");
    if (input.id !== null) assertId(input.id);
    let row = await saveEntry({ collection: input.collection as CollectionName, id: input.id, data: input.data, expectedVersion: input.version }, a);
    if (input.publish) {
      row = await publishEntry(row.id, row.version, a);
      published();
    }
    refresh();
    return { ok: true, message: input.publish ? "Saved and published." : "Draft saved.", entry: brief(row), data: row.draftData as Record<string, unknown> };
  });
}

export async function publishContent(id: string, version: number): Promise<ActionResult> {
  return run(async (a) => {
    assertId(id);
    assertVersion(version);
    const row = await publishEntry(id, version, a);
    published();
    refresh();
    return { ok: true, message: "Published.", entry: brief(row) };
  });
}

export async function unpublishContent(id: string, version: number): Promise<ActionResult> {
  return run(async (a) => {
    assertId(id);
    assertVersion(version);
    const row = await unpublishEntry(id, version, a);
    published();
    refresh();
    return { ok: true, message: "Unpublished. It is no longer visible on the site.", entry: brief(row) };
  });
}

export async function discardContent(id: string, version: number): Promise<ActionResult> {
  return run(async (a) => {
    assertId(id);
    assertVersion(version);
    const row = await discardDraft(id, version, a);
    refresh();
    return { ok: true, message: "Draft changes discarded.", entry: brief(row), data: row.draftData as Record<string, unknown> };
  });
}

export async function deleteContent(id: string, version: number): Promise<ActionResult> {
  return run(async (a) => {
    assertId(id);
    assertVersion(version);
    const row = await deleteEntry(id, version, a);
    if (row.publishedData != null) published();
    refresh();
    return { ok: true, message: "Moved to the trash." };
  });
}

export async function restoreContent(id: string): Promise<ActionResult> {
  return run(async (a) => {
    assertId(id);
    const row = await restoreEntry(id, a);
    if (row.publishedData != null) published();
    refresh();
    return { ok: true, message: "Restored from the trash.", entry: brief(row) };
  });
}

export async function duplicateContent(id: string): Promise<ActionResult> {
  return run(async (a) => {
    assertId(id);
    const row = await duplicateEntry(id, a);
    refresh();
    return { ok: true, message: "Duplicated as a new draft.", entry: brief(row) };
  });
}

export async function moveContent(id: string, direction: -1 | 1): Promise<ActionResult> {
  return run(async (a) => {
    assertId(id);
    if (direction !== -1 && direction !== 1) throw new ContentError("invalid", "Invalid direction.");
    await moveEntry(id, direction, a);
    refresh();
    return { ok: true, message: "Order changed. Publish the moved items to apply the new order on the site." };
  });
}

/** Show or hide a list item and publish that change straight away. */
export async function setVisibility(id: string, version: number, visible: boolean): Promise<ActionResult> {
  return run(async (a) => {
    assertId(id);
    assertVersion(version);
    const row = await getEntry(id);
    if (!row || isSingleton(row.collection)) throw new ContentError("not_found", "This item no longer exists.");
    const data = { ...(row.draftData as Record<string, unknown>), visible: Boolean(visible) };
    const saved = await saveEntry({ collection: row.collection as CollectionName, id, data, expectedVersion: version }, a);
    refresh();
    return { ok: true, message: visible ? "Shown (draft). Publish to apply." : "Hidden (draft). Publish to apply.", entry: brief(saved) };
  });
}

export async function publishEverything(): Promise<ActionResult> {
  return run(async (a) => {
    const n = await publishAll(a);
    if (n > 0) published();
    refresh();
    return { ok: true, message: n ? `Published ${n} item${n === 1 ? "" : "s"}.` : "Nothing to publish." };
  });
}

export async function restoreRevisionAction(revisionId: number): Promise<ActionResult> {
  return run(async (a) => {
    if (!Number.isInteger(revisionId)) throw new ContentError("invalid", "Invalid revision.");
    const row = await restoreRevision(revisionId, a);
    if (row.publishedData != null) published(); // a restored item that was in the trash may be public again
    refresh();
    return { ok: true, message: "That version is now the draft. Review it, then publish.", entry: brief(row) };
  });
}
