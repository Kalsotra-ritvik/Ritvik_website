/**
 * Where static data/media are served from. Defaults to this site (`/public`).
 * To move large assets to object storage later (e.g. a Cloudflare R2 bucket on
 * a public custom domain), set NEXT_PUBLIC_ASSET_BASE_URL at build time and
 * upload the same paths there (with CORS allowing this site's origin).
 */
const BASE = (process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? "").replace(/\/+$/, "");

export function assetUrl(path: string): string {
  return `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
}
