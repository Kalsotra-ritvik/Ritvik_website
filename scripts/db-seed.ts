/**
 * Seed the database with the portfolio's current content (lib/content/defaults.ts).
 * Usage: npm run db:seed
 *
 * Idempotent: a collection that already has entries is left untouched, so
 * running it again never overwrites edits made in the admin. Seeded entries are
 * published immediately so the public site keeps showing the same content.
 */
import "./_env";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, isNull } from "drizzle-orm";
import { contentEntries, contentRevisions } from "../lib/db/schema";
import { SINGLETON_DEFAULTS, defaultContent } from "../lib/content/defaults";
import { LISTS, SINGLETONS, type ListName } from "../lib/content/schema";

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is not set.");
  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => undefined });
  const db = drizzle(sql);
  const content = defaultContent();
  let created = 0;
  try {
    const insert = async (collection: string, key: string, data: Record<string, unknown>) => {
      const row = (
        await db
          .insert(contentEntries)
          .values({ collection, key, draftData: data, publishedData: data, publishedRev: 1, everPublished: true, publishedAt: new Date() })
          .returning()
      )[0];
      await db.insert(contentRevisions).values({
        entryId: row.id,
        collection,
        key,
        action: "seed",
        data,
        published: true,
        version: row.version,
        adminLogin: "seed",
      });
      created++;
    };
    const has = async (collection: string) =>
      (await db.select({ id: contentEntries.id }).from(contentEntries).where(and(eq(contentEntries.collection, collection), isNull(contentEntries.deletedAt))).limit(1)).length > 0;

    for (const [name, schema] of Object.entries(SINGLETONS)) {
      if (await has(name)) continue;
      const data = schema.parse(SINGLETON_DEFAULTS[name as keyof typeof SINGLETON_DEFAULTS]);
      await insert(name, name, data as Record<string, unknown>);
    }
    const lists: [ListName, Record<string, unknown>[]][] = [
      ["education", content.education],
      ["experience", content.experience],
      ["project", content.projects],
      ["skillGroup", content.skillGroups],
      ["credential", content.credentials],
    ];
    for (const [name, items] of lists) {
      if (await has(name)) continue;
      for (const item of items) {
        const data = LISTS[name].parse(item) as Record<string, unknown>;
        const key = name === "project" ? String(data.slug) : `${name}-${String(data.order)}`;
        await insert(name, key, data);
      }
    }
    console.log(created ? `db:seed — created ${created} entries.` : "db:seed — content already present; nothing changed.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("db:seed failed:", err.message ?? err);
  process.exit(1);
});
