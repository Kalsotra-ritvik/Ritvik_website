import { revalidateTag } from "next/cache";
import { requireAdminApi } from "@/lib/auth/dal";
import { mediaError } from "@/lib/media/http";
import { CONTENT_TAG } from "@/lib/content/public";
import { MediaError, createFromBytes, listMedia } from "@/lib/media/service";
import { getStorage, storageStatus } from "@/lib/storage";

function storageInfo() {
  const status = storageStatus();
  let direct = false;
  let maxServerUpload = 0;
  if (status.ready) {
    const s = getStorage();
    direct = s.supportsDirectUpload;
    maxServerUpload = s.maxServerUpload;
  }
  return { ready: status.ready, driver: status.driver, message: status.message, direct, maxServerUpload };
}

export async function GET(request: Request) {
  try {
    await requireAdminApi(request);
    return Response.json({ items: await listMedia(), storage: storageInfo() });
  } catch (err) {
    return mediaError(err);
  }
}

/** Upload through the server: multipart form with `file` and optional `replaceId`. */
export async function POST(request: Request) {
  try {
    const session = await requireAdminApi(request);
    const storage = getStorage();
    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > storage.maxServerUpload + 64 * 1024) throw new MediaError(413, "This file is too large to upload through the server.");
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new MediaError(400, "The upload could not be read.");
    }
    const file = form.get("file");
    if (!(file instanceof File)) throw new MediaError(400, "Choose a file to upload.");
    const replaceId = form.get("replaceId");
    const replace = typeof replaceId === "string" && /^[0-9a-f-]{36}$/.test(replaceId) ? replaceId : undefined;
    const item = await createFromBytes(new Uint8Array(await file.arrayBuffer()), file.name || "upload", session.admin.id, replace);
    // A replaced file keeps its id but gets a new URL; refresh the published site.
    if (replace) revalidateTag(CONTENT_TAG, { expire: 0 });
    return Response.json({ item }, { status: 201 });
  } catch (err) {
    return mediaError(err);
  }
}
