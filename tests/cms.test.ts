import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/lib/db/client";
import { contentRevisions, media } from "@/lib/db/schema";
import { LIST_TEMPLATES, SINGLETON_DEFAULTS } from "@/lib/content/defaults";
import {
  ContentError,
  deleteEntry,
  discardDraft,
  duplicateEntry,
  listEntries,
  listRevisions,
  loadContent,
  mediaReferences,
  moveEntry,
  publishAll,
  publishEntry,
  restoreEntry,
  restoreRevision,
  saveEntry,
  statusOf,
  unpublishEntry,
  type Actor,
} from "@/lib/content/service";
import { createTestAdmin, hasTestDb, resetDb } from "./helpers/db";

const project = (title: string, slug: string, extra: Record<string, unknown> = {}) => ({ ...LIST_TEMPLATES.project, title, slug, ...extra });

describe.skipIf(!hasTestDb)("content lifecycle (database)", () => {
  let actor: Actor;
  beforeEach(async () => {
    await resetDb();
    actor = (await createTestAdmin()).actor;
  });
  afterAll(closeDb);

  it("keeps drafts private until they are published", async () => {
    const row = await saveEntry({ collection: "project", id: null, data: project("Secret draft", "secret-draft"), expectedVersion: null }, actor);
    expect(statusOf(row)).toBe("draft");
    expect((await loadContent("published")).content.projects.map((p) => p.title)).not.toContain("Secret draft");
    expect((await loadContent("draft")).content.projects.map((p) => p.title)).toContain("Secret draft");

    const published = await publishEntry(row.id, row.version, actor);
    expect(statusOf(published)).toBe("published");
    expect((await loadContent("published")).content.projects.map((p) => p.title)).toContain("Secret draft");

    // Editing a published item changes only the draft.
    const edited = await saveEntry({ collection: "project", id: row.id, data: project("Edited title", "secret-draft"), expectedVersion: published.version }, actor);
    expect(statusOf(edited)).toBe("changed");
    expect((await loadContent("published")).content.projects[0].title).toBe("Secret draft");
    const discarded = await discardDraft(edited.id, edited.version, actor);
    expect((discarded.draftData as { title: string }).title).toBe("Secret draft");
  });

  it("rejects conflicting edits", async () => {
    const row = await saveEntry({ collection: "project", id: null, data: project("A", "a"), expectedVersion: null }, actor);
    await saveEntry({ collection: "project", id: row.id, data: project("B", "a"), expectedVersion: row.version }, actor);
    await expect(saveEntry({ collection: "project", id: row.id, data: project("C", "a"), expectedVersion: row.version }, actor)).rejects.toMatchObject({
      code: "conflict",
    });
  });

  it("validates on the server and reports field paths", async () => {
    const err = await saveEntry({ collection: "project", id: null, data: project("", "Bad Slug!"), expectedVersion: null }, actor).catch((e) => e);
    expect(err).toBeInstanceOf(ContentError);
    expect(err.code).toBe("invalid");
    expect(err.issues.map((i: { path: string }) => i.path)).toEqual(expect.arrayContaining(["title", "slug"]));
    await expect(saveEntry({ collection: "visual", id: null, data: { ...SINGLETON_DEFAULTS.visual, bloom: 9 }, expectedVersion: null }, actor)).rejects.toBeInstanceOf(
      ContentError,
    );
  });

  it("enforces unique project slugs", async () => {
    await saveEntry({ collection: "project", id: null, data: project("A", "same"), expectedVersion: null }, actor);
    await expect(saveEntry({ collection: "project", id: null, data: project("B", "same"), expectedVersion: null }, actor)).rejects.toMatchObject({ code: "invalid" });
  });

  it("hides unpublished and hidden items from visitors", async () => {
    const a = await publishEntry(...(await (async () => {
      const r = await saveEntry({ collection: "project", id: null, data: project("Visible", "visible"), expectedVersion: null }, actor);
      return [r.id, r.version, actor] as const;
    })()));
    const hidden = await saveEntry({ collection: "project", id: null, data: project("Hidden", "hidden", { visible: false }), expectedVersion: null }, actor);
    await publishEntry(hidden.id, hidden.version, actor);
    expect((await loadContent("published")).content.projects.map((p) => p.title)).toEqual(["Visible"]);
    await unpublishEntry(a.id, a.version, actor);
    expect((await loadContent("published")).content.projects).toEqual([]);
  });

  it("records revisions and restores an earlier version as a draft", async () => {
    const r1 = await saveEntry({ collection: "project", id: null, data: project("First", "p"), expectedVersion: null }, actor);
    const r2 = await saveEntry({ collection: "project", id: r1.id, data: project("Second", "p"), expectedVersion: r1.version }, actor);
    await publishEntry(r2.id, r2.version, actor);
    const revs = await listRevisions({ entryId: r1.id });
    expect(revs.map((r) => r.action)).toEqual(["publish", "save", "create"]);
    expect(revs.every((r) => r.adminLogin === "tester")).toBe(true);
    const first = revs.find((r) => r.action === "create")!;
    const restored = await restoreRevision(first.id, actor);
    expect((restored.draftData as { title: string }).title).toBe("First");
    expect(statusOf(restored)).toBe("changed");
    expect((await loadContent("published")).content.projects[0].title).toBe("Second");
  });

  it("soft-deletes, restores and duplicates", async () => {
    const r = await saveEntry({ collection: "project", id: null, data: project("Keep me", "keep"), expectedVersion: null }, actor);
    const p = await publishEntry(r.id, r.version, actor);
    const d = await deleteEntry(p.id, p.version, actor);
    expect(d.deletedAt).not.toBeNull();
    expect((await loadContent("published")).content.projects).toEqual([]);
    expect(await listEntries("project")).toEqual([]);
    await restoreEntry(r.id, actor);
    expect((await loadContent("published")).content.projects.map((x) => x.title)).toEqual(["Keep me"]);
    const copy = await duplicateEntry(r.id, actor);
    expect((copy.draftData as { title: string }).title).toBe("Keep me (copy)");
    expect(statusOf(copy)).toBe("draft");
    await expect(deleteEntry((await saveEntry({ collection: "site", id: null, data: SINGLETON_DEFAULTS.site, expectedVersion: null }, actor)).id, 1, actor)).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("reorders list items and publishes everything pending", async () => {
    const a = await saveEntry({ collection: "project", id: null, data: project("A", "a"), expectedVersion: null }, actor);
    await saveEntry({ collection: "project", id: null, data: project("B", "b"), expectedVersion: null }, actor);
    await moveEntry(a.id, 1, actor);
    expect((await listEntries("project")).map((e) => e.title)).toEqual(["B", "A"]);
    expect(await publishAll(actor)).toBe(2);
    expect((await loadContent("published")).content.projects.map((p) => p.title)).toEqual(["B", "A"]);
    expect(await publishAll(actor)).toBe(0);
  });

  it("tracks where media files are used", async () => {
    const [m] = await getDb()
      .insert(media)
      .values({ driver: "local", storageKey: "2026/01/123e4567-e89b-12d3-a456-426614174000-x.png", originalName: "x.png", mime: "image/png", kind: "image", size: 10 })
      .returning();
    await saveEntry(
      { collection: "project", id: null, data: project("With image", "img", { cardImage: { mediaId: m.id, src: "", alt: "A figure" } }), expectedVersion: null },
      actor,
    );
    const refs = await mediaReferences(m.id);
    expect(refs.map((r) => r.title)).toEqual(["With image"]);
    const pub = await publishAll(actor);
    expect(pub).toBe(1);
    const content = (await loadContent("published")).content;
    expect(content.media[m.id].url).toBe("/media/2026/01/123e4567-e89b-12d3-a456-426614174000-x.png");
    expect(await getDb().select().from(contentRevisions)).not.toHaveLength(0);
  });
});
