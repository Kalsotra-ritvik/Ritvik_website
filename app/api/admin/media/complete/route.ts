import { revalidateTag } from "next/cache";
import { requireAdminApi } from "@/lib/auth/dal";
import { CONTENT_TAG } from "@/lib/content/public";
import { MediaError, completeDirectUpload } from "@/lib/media/service";
import { mediaError } from "@/lib/media/http";

/** Verify a direct upload (size and file signature) before it appears in the library. */
export async function POST(request: Request) {
  try {
    await requireAdminApi(request);
    const body = await request.json().catch(() => null);
    const uuid = /^[0-9a-f-]{36}$/;
    if (!body || typeof body.id !== "string" || !uuid.test(body.id)) throw new MediaError(400, "Invalid upload.");
    const replaceId = typeof body.replaceId === "string" && uuid.test(body.replaceId) ? body.replaceId : undefined;
    const item = await completeDirectUpload(body.id, replaceId);
    if (replaceId) revalidateTag(CONTENT_TAG, { expire: 0 });
    return Response.json({ item }, { status: 201 });
  } catch (err) {
    return mediaError(err);
  }
}
