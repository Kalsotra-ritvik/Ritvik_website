import "server-only";
import { HttpError, apiError } from "@/lib/auth/dal";
import { StorageNotConfiguredError } from "@/lib/storage";
import { MediaError } from "./service";

export function mediaError(err: unknown) {
  if (err instanceof MediaError) return Response.json({ error: err.message }, { status: err.status });
  if (err instanceof StorageNotConfiguredError) return Response.json({ error: err.message }, { status: 503 });
  if (!(err instanceof HttpError)) console.error("Media request failed:", err);
  return apiError(err);
}
