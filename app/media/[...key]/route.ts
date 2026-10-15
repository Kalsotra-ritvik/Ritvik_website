import { readLocalFile } from "@/lib/storage";
import { findLocalMedia } from "@/lib/media/service";
import { isDatabaseConfigured } from "@/lib/db/client";

/**
 * Serves files from the local storage driver. Only files registered in the
 * media library are served, always with the type recorded at upload.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const storageKey = key.join("/");
  if (!isDatabaseConfigured() || storageKey.length > 200) return new Response("Not found", { status: 404 });
  const row = await findLocalMedia(storageKey).catch(() => undefined);
  if (!row) return new Response("Not found", { status: 404 });
  const body = await readLocalFile(storageKey);
  if (!body) return new Response("Not found", { status: 404 });
  const headers: Record<string, string> = {
    "Content-Type": row.mime,
    "Content-Length": String(body.length),
    "X-Content-Type-Options": "nosniff",
    // Keys are unique per upload, so the file at a URL never changes.
    "Cache-Control": "public, max-age=31536000, immutable",
  };
  if (row.mime !== "application/pdf") headers["Content-Security-Policy"] = "default-src 'none'; sandbox";
  if (row.kind === "model") headers["Content-Disposition"] = `attachment; filename="${row.storageKey.split("/").pop()}"`;
  return new Response(new Uint8Array(body), { headers });
}
