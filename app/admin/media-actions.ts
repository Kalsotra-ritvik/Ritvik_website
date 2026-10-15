"use server";

import { refresh, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { CONTENT_TAG } from "@/lib/content/public";
import { MediaError, deleteMedia, updateMediaMeta, type MediaDto } from "@/lib/media/service";

export type MediaResult = { ok: true; message: string; item?: MediaDto } | { ok: false; error: string };

const uuid = /^[0-9a-f-]{36}$/;

async function guard(fn: () => Promise<MediaResult>): Promise<MediaResult> {
  await requireAdmin();
  try {
    return await fn();
  } catch (err) {
    if (err instanceof MediaError) return { ok: false, error: err.message };
    console.error("Media action failed:", err);
    return { ok: false, error: "The change could not be saved because of a server error." };
  }
}

export async function saveMediaMeta(id: string, title: string, alt: string): Promise<MediaResult> {
  return guard(async () => {
    if (!uuid.test(id)) throw new MediaError(400, "Invalid file.");
    const item = await updateMediaMeta(id, { title: String(title), alt: String(alt) });
    updateTag(CONTENT_TAG); // default alt text is used on the public site
    refresh();
    return { ok: true, message: "Details saved.", item };
  });
}

export async function removeMedia(id: string): Promise<MediaResult> {
  return guard(async () => {
    if (!uuid.test(id)) throw new MediaError(400, "Invalid file.");
    await deleteMedia(id);
    refresh();
    return { ok: true, message: "File deleted." };
  });
}
