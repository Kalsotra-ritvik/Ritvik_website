/** Browser-side upload helper used by the media library and pickers. */
export interface StorageInfo {
  ready: boolean;
  driver: string;
  message: string;
  direct: boolean;
  maxServerUpload: number;
}

export interface UploadedMedia {
  id: string;
  url: string;
  mime: string;
  kind: string;
  originalName: string;
  title: string | null;
  alt: string | null;
  width: number | null;
  height: number | null;
  size: number;
  createdAt: string;
}

async function errorText(res: Response) {
  try {
    const body = await res.json();
    if (typeof body?.error === "string") return body.error;
  } catch {
    // fall through
  }
  return res.status === 413 ? "The file is too large." : `Upload failed (${res.status}).`;
}

function putWithProgress(url: string, file: File, headers: Record<string, string>, onProgress?: (f: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Storage rejected the upload (${xhr.status}).`)));
    xhr.onerror = () => reject(new Error("The upload was interrupted. Check the connection and the bucket's CORS settings."));
    xhr.send(file);
  });
}

function postWithProgress(url: string, form: FormData, onProgress?: (f: number) => void) {
  return new Promise<Response>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => resolve(new Response(xhr.responseText, { status: xhr.status, headers: { "content-type": "application/json" } }));
    xhr.onerror = () => reject(new Error("The upload was interrupted."));
    xhr.send(form);
  });
}

export async function uploadFile(file: File, storage: StorageInfo, onProgress?: (f: number) => void, replaceId?: string): Promise<UploadedMedia> {
  if (!storage.ready) throw new Error(storage.message);
  if (storage.direct && file.size > storage.maxServerUpload) {
    const res = await fetch("/api/admin/media/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: file.name, size: file.size, type: file.type, replaceId }),
    });
    if (!res.ok) throw new Error(await errorText(res));
    const { id, url, headers } = await res.json();
    await putWithProgress(url, file, headers, onProgress);
    const done = await fetch("/api/admin/media/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, replaceId }),
    });
    if (!done.ok) throw new Error(await errorText(done));
    return (await done.json()).item;
  }
  const form = new FormData();
  form.set("file", file);
  if (replaceId) form.set("replaceId", replaceId);
  const res = await postWithProgress("/api/admin/media", form, onProgress);
  if (!res.ok) throw new Error(await errorText(res));
  return (await res.json()).item;
}
