import type { Metadata } from "next";
import {
  absoluteUrl,
  DEFAULT_DESCRIPTION,
  metaDescription,
  SITE_NAME,
} from "@/lib/seo/site";

type BuildPageMetaInput = {
  title: string;
  description?: string;
  path: string;
  /** Default indexable for public marketing/content pages */
  robots?: Metadata["robots"];
  imagePath?: string;
  type?: "website" | "article";
  noIndex?: boolean;
};

/**
 * Shared public-page metadata: title, description, canonical, Open Graph, Twitter.
 * Never pass emails, private notes, or unpublished content here.
 */
export function buildPageMetadata(input: BuildPageMetaInput): Metadata {
  const description = metaDescription(
    input.description?.trim() || DEFAULT_DESCRIPTION,
  );
  const url = absoluteUrl(input.path);
  const robots =
    input.robots ??
    (input.noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : { index: true, follow: true });

  // File convention app/opengraph-image.tsx provides the default card art.
  const ogImage = absoluteUrl(input.imagePath ?? "/opengraph-image");

  return {
    title: input.title,
    description,
    alternates: { canonical: url },
    robots,
    openGraph: {
      type: input.type ?? "website",
      url,
      siteName: SITE_NAME,
      title: `${input.title} · ${SITE_NAME}`,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: SITE_NAME }],
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: `${input.title} · ${SITE_NAME}`,
      description,
      images: [ogImage],
    },
  };
}

/** Account/admin/billing surfaces — never indexed; no canonical share cards. */
export function privatePageMetadata(title: string): Metadata {
  return {
    title,
    description: "Private DETECTIVE surface — not indexed.",
    robots: {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false },
    },
  };
}
