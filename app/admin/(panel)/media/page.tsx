import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/dal";
import { listMedia, mediaUsage } from "@/lib/media/service";
import { getStorage, storageStatus } from "@/lib/storage";
import MediaLibrary from "@/components/admin/MediaLibrary";
import { Notice, PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Media library" };

export default async function MediaPage() {
  await requireAdmin();
  const status = storageStatus();
  const [items, usage] = await Promise.all([listMedia(), mediaUsage()]);
  const adapter = status.ready ? getStorage() : null;
  return (
    <>
      <PageHeader
        title="Media library"
        description="Images, videos, PDFs and 3D/structure files used across the site. Files are checked by their contents; SVG and unknown formats are rejected."
      />
      <div className="mb-4">
        <Notice tone={status.ready ? "info" : "warn"} title={status.ready ? undefined : "Uploads are disabled"}>
          {status.message}
        </Notice>
      </div>
      <MediaLibrary
        initialItems={items}
        usage={usage}
        storage={{ ready: status.ready, driver: status.driver, message: status.message, direct: adapter?.supportsDirectUpload ?? false, maxServerUpload: adapter?.maxServerUpload ?? 0 }}
      />
    </>
  );
}
