/** Public URL for a stored media object (no filesystem or network access). */
export function publicUrlFor(driver: string, key: string): string {
  if (driver === "r2") {
    const base = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/+$/, "");
    return base ? `${base}/${key}` : "";
  }
  return `/media/${key}`;
}
