import type { Metadata } from "next";
import { SITE_URL } from "@/lib/config";

/**
 * Consistent per-page metadata: canonical plus matching OpenGraph/Twitter
 * (otherwise pages fall back to the root layout's homepage card, leaving
 * og:url pointing at the homepage instead of the page itself).
 */
export function pageMeta({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = `${SITE_URL}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      images: [
        { url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: title },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
