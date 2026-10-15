import { Suspense } from "react";
import type { Metadata } from "next";
import { draftMode } from "next/headers";
import Portfolio from "@/components/Portfolio";
import PreviewBanner from "@/components/PreviewBanner";
import { getDraftContent, getPublishedContent, resolveAsset } from "@/lib/content/public";
import { getSession } from "@/lib/auth/dal";

export async function generateMetadata(): Promise<Metadata> {
  const { content } = await getPublishedContent();
  const { site } = content;
  const og = resolveAsset(site.ogImage, content.media);
  const icon = resolveAsset(site.favicon, content.media);
  return {
    title: site.title,
    description: site.description,
    authors: [{ name: content.profile.name }],
    openGraph: {
      title: site.ogTitle || site.title,
      description: site.ogDescription || site.description,
      type: "website",
      ...(og ? { images: [{ url: og.url, alt: og.alt }] } : {}),
    },
    ...(icon ? { icons: { icon: icon.url } } : {}),
    robots: { index: true, follow: true },
  };
}

export default async function Home() {
  const { isEnabled } = await draftMode();
  if (isEnabled) {
    return (
      <Suspense fallback={null}>
        <DraftOrPublished />
      </Suspense>
    );
  }
  const { content } = await getPublishedContent();
  return <Portfolio content={content} />;
}

/**
 * Draft preview: only for a signed-in administrator. A stray draft-mode cookie
 * without a valid admin session just shows the published site.
 */
async function DraftOrPublished() {
  const session = await getSession();
  if (!session) {
    const { content } = await getPublishedContent();
    return <Portfolio content={content} />;
  }
  const { content } = await getDraftContent();
  return <Portfolio content={content} banner={<PreviewBanner />} />;
}
