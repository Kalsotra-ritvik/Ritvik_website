import { requireAdminApi } from "@/lib/auth/dal";
import { MediaError, presignUpload } from "@/lib/media/service";
import { mediaError } from "@/lib/media/http";

export async function POST(request: Request) {
  try {
    const session = await requireAdminApi(request);
    const body = await request.json().catch(() => null);
    if (!body || typeof body.name !== "string" || typeof body.size !== "number" || typeof body.type !== "string") throw new MediaError(400, "Invalid upload request.");
    const replaceId = typeof body.replaceId === "string" && /^[0-9a-f-]{36}$/.test(body.replaceId) ? body.replaceId : undefined;
    return Response.json(await presignUpload({ name: body.name.slice(0, 200), size: body.size, type: body.type, replaceId }, session.admin.id));
  } catch (err) {
    return mediaError(err);
  }
}
