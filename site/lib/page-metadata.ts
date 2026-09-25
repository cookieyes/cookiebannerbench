import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/config";

/**
 * A page's title, description, canonical and social tags from one place, so
 * og:url always equals the canonical. A page's openGraph replaces the layout's
 * rather than merging with it, so siteName and type are restated here. Images
 * come from each route's opengraph-image file unless one is passed.
 */
export function pageMetadata({
  title,
  description,
  path,
  image,
}: {
  title: string;
  description: string;
  path: string;
  image?: { url: string; alt: string };
}): Metadata {
  const url = `${SITE_URL}${path}`;
  const images = image ? [{ ...image, width: 1200, height: 630 }] : undefined;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      siteName: SITE_NAME,
      type: "website",
      title,
      description,
      url,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [image.url] } : {}),
    },
  };
}
