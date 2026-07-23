import type { Metadata } from "next";
import { Workspace } from "@/components/Workspace";
import { SeoContent } from "@/components/SeoContent";
import { APPS, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

/**
 * Per-route metadata for the catch-all workspace. Each app deep-link
 * (`/pdfeditor`, `/image`, …) gets its own <title>, description and canonical
 * so every tool can rank on its own terms while the root ranks the brand.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const path = "/" + (slug?.[0] ?? "");
  const app = APPS.find((a) => a.path === path);

  // Unknown/root path: fall back to the site-wide metadata from the layout.
  if (!app || app.path === "/") return {};

  const title = `${app.name} — ${app.blurb}`;
  const description = `${app.name} on ${SITE_NAME} (${SITE_TAGLINE}): ${app.blurb}. Free, offline-first and private — no sign-up, data stays in your browser.`;
  return {
    title: app.name,
    description,
    alternates: { canonical: app.path },
    openGraph: { url: app.path, title, description },
    twitter: { title, description },
  };
}

/**
 * Single client-driven workspace served for every path. The active app and PDF
 * section are derived from the URL inside {@link Workspace}. {@link SeoContent}
 * adds server-rendered, crawlable text so search engines have real content to
 * index on this otherwise client-rendered app.
 */
export default function Page() {
  return (
    <>
      <SeoContent />
      <Workspace />
    </>
  );
}
