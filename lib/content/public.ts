/**
 * Public content access with Next.js caching.
 *
 * Published content is cached under one tag; publishing in the admin calls
 * updateTag(CONTENT_TAG) so the live site picks up changes without a redeploy.
 * Draft content is never cached and is only loaded for an authenticated admin.
 */
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { isDatabaseConfigured } from "@/lib/db/client";
import type { AssetRef, SiteContent } from "./schema";
import { loadContent } from "./service";

export const CONTENT_TAG = "site-content";

export async function getPublishedContent() {
  "use cache";
  cacheTag(CONTENT_TAG);
  const result = await loadContent("published");
  // If the database was configured but unreachable, retry soon instead of caching the fallback for long.
  if (result.error && isDatabaseConfigured()) cacheLife("minutes");
  else cacheLife("max");
  return result;
}

export async function getDraftContent() {
  return loadContent("draft");
}

export function resolveAsset(ref: AssetRef | undefined | null, media: SiteContent["media"]): { url: string; alt: string; mime?: string } | null {
  if (!ref) return null;
  if (ref.mediaId) {
    const m = media[ref.mediaId];
    if (m) return { url: m.url, alt: ref.alt || m.alt || "", mime: m.mime };
  }
  if (ref.src) return { url: ref.src, alt: ref.alt };
  return null;
}
