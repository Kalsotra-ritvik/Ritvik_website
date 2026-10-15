/**
 * Database schema (PostgreSQL, via Drizzle ORM).
 *
 * Content model: every editable record is one row in `content_entries` holding a
 * draft and (optionally) a published JSON document validated by the Zod schemas
 * in lib/content/schema.ts. The public site only ever reads `published_data`.
 * Every change appends to `content_revisions`, so earlier versions stay recoverable.
 */
import { sql } from "drizzle-orm";
import { bigint, boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const admins = pgTable(
  "admins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Stored lower-cased; compared case-insensitively. */
    loginId: text("login_id").notNull(),
    /** Argon2id PHC string. Never a plaintext password. */
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name"),
    role: text("role").notNull().default("owner"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("admins_login_id_idx").on(t.loginId)],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 of the session token (hex). The raw token only exists in the cookie. */
    id: text("id").primaryKey(),
    adminId: uuid("admin_id")
      .notNull()
      .references(() => admins.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
  },
  (t) => [index("sessions_admin_idx").on(t.adminId), index("sessions_expires_idx").on(t.expiresAt)],
);

/** Login throttling buckets, keyed by a hash of the client IP or of the submitted login ID. */
export const loginAttempts = pgTable("login_attempts", {
  key: text("key").primaryKey(),
  failures: integer("failures").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
});

export const contentEntries = pgTable(
  "content_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    collection: text("collection").notNull(),
    /** Stable key: the singleton name, or a slug/identifier for list items. */
    key: text("key").notNull(),
    draftData: jsonb("draft_data").notNull(),
    publishedData: jsonb("published_data"),
    /** Incremented on every write; used to reject conflicting edits. */
    version: integer("version").notNull().default(1),
    /** Draft revision counter; publishing copies it to publishedRev. */
    draftRev: integer("draft_rev").notNull().default(1),
    publishedRev: integer("published_rev"),
    /** True once the entry has been published at least once. */
    everPublished: boolean("ever_published").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    updatedBy: uuid("updated_by").references(() => admins.id, { onDelete: "set null" }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("content_collection_key_idx").on(t.collection, t.key).where(sql`${t.deletedAt} is null`),
    index("content_collection_idx").on(t.collection),
  ],
);

export const contentRevisions = pgTable(
  "content_revisions",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    entryId: uuid("entry_id").notNull(),
    collection: text("collection").notNull(),
    key: text("key").notNull(),
    /** create | save | publish | unpublish | discard | delete | restore | revert */
    action: text("action").notNull(),
    /** Snapshot of the draft after the action. */
    data: jsonb("data").notNull(),
    published: boolean("published").notNull().default(false),
    version: integer("version").notNull(),
    adminId: uuid("admin_id").references(() => admins.id, { onDelete: "set null" }),
    adminLogin: text("admin_login"),
    createdAt: createdAt(),
  },
  (t) => [index("revisions_entry_idx").on(t.entryId, t.createdAt)],
);

export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** local | r2 */
    driver: text("driver").notNull(),
    storageKey: text("storage_key").notNull(),
    originalName: text("original_name").notNull(),
    mime: text("mime").notNull(),
    kind: text("kind").notNull(),
    size: integer("size").notNull(),
    sha256: text("sha256"),
    width: integer("width"),
    height: integer("height"),
    title: text("title"),
    alt: text("alt"),
    /** pending (direct upload not yet verified) | ready */
    status: text("status").notNull().default("ready"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    uploadedBy: uuid("uploaded_by").references(() => admins.id, { onDelete: "set null" }),
  },
  (t) => [uniqueIndex("media_storage_key_idx").on(t.storageKey)],
);

export type Admin = typeof admins.$inferSelect;
export type ContentEntry = typeof contentEntries.$inferSelect;
export type ContentRevision = typeof contentRevisions.$inferSelect;
export type MediaRow = typeof media.$inferSelect;
