import { afterEach, describe, expect, it } from "vitest";
import { sniff, safeBaseName, storageKeyFor, imageSize } from "@/lib/media/validate";
import { assertSafeKey, storageStatus } from "@/lib/storage";

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 1, 0, 0, 0, 0, 200, 8, 6, 0, 0, 0, 0, 0, 0, 0]);
const text = (s: string) => new TextEncoder().encode(s);

describe("upload validation", () => {
  it("identifies files by content, not name", async () => {
    const png = await sniff(PNG, "photo.jpg");
    expect(png.ok && png.type.mime).toBe("image/png");
    expect(imageSize(PNG, "image/png")).toEqual({ width: 256, height: 200 });
    const pdf = await sniff(text("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n"), "x.pdf");
    expect(pdf.ok && pdf.type.mime).toBe("application/pdf");
  });

  it("rejects SVG, HTML disguised as images and unknown files", async () => {
    expect((await sniff(text('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), "a.svg")).ok).toBe(false);
    expect((await sniff(text('<?xml version="1.0"?><svg/>'), "a.png")).ok).toBe(false);
    expect((await sniff(text("<html><script>alert(1)</script></html>"), "a.png")).ok).toBe(false);
    expect((await sniff(Uint8Array.from([0x4d, 0x5a, 0x90, 0x00, 1, 2, 3]), "a.exe")).ok).toBe(false);
    expect((await sniff(new Uint8Array(), "empty.png")).ok).toBe(false);
  });

  it("recognises structure files", async () => {
    const pdb = await sniff(text("HEADER    MEMBRANE PROTEIN\nATOM      1  N   MET A   1      11.104  13.207   2.100  1.00 20.00           N\n"), "x.pdb");
    expect(pdb.ok && pdb.type.mime).toBe("chemical/x-pdb");
    const cif = await sniff(text("data_7VSI\n_entry.id 7VSI\nloop_\n_atom_site.group_PDB\n"), "x.cif");
    expect(cif.ok && cif.type.mime).toBe("chemical/x-mmcif");
  });

  it("generates safe storage keys", () => {
    const key = storageKeyFor("123e4567-e89b-12d3-a456-426614174000", "../../etc/My Photo (1).PNG", "png", new Date("2026-03-04T00:00:00Z"));
    expect(key).toBe("2026/03/123e4567-e89b-12d3-a456-426614174000-etc-my-photo-1.png");
    expect(() => assertSafeKey(key)).not.toThrow();
    expect(() => assertSafeKey("../secret")).toThrow();
    expect(() => assertSafeKey("2026/03/x/../../a.png")).toThrow();
    expect(safeBaseName("....")).toBe("file");
  });
});

describe("storage configuration", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("refuses non-persistent local storage on Vercel", () => {
    process.env.VERCEL = "1";
    process.env.STORAGE_DRIVER = "local";
    const s = storageStatus();
    expect(s.ready).toBe(false);
    expect(s.message).toMatch(/not persistent/);
  });

  it("requires every R2 variable before uploads are enabled", () => {
    process.env.VERCEL = "1";
    delete process.env.STORAGE_DRIVER;
    for (const k of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_BASE_URL"]) delete process.env[k];
    const s = storageStatus();
    expect(s.driver).toBe("r2");
    expect(s.ready).toBe(false);
    expect(s.missing).toContain("R2_BUCKET");
    Object.assign(process.env, { R2_ACCOUNT_ID: "a", R2_ACCESS_KEY_ID: "b", R2_SECRET_ACCESS_KEY: "c", R2_BUCKET: "d", R2_PUBLIC_BASE_URL: "https://cdn.example" });
    expect(storageStatus().ready).toBe(true);
  });

  it("uses local disk in development", () => {
    delete process.env.VERCEL;
    process.env.STORAGE_DRIVER = "local";
    expect(storageStatus().ready).toBe(true);
  });
});
