import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/config";
import { fetchArticles } from "@/lib/strapi";
import { escapeXml, truncate } from "@/lib/utils";

export const revalidate = 3600;

export async function GET() {
  const articles = await fetchArticles(50);

  const items = articles
    .map((a) => {
      const url = `${SITE_URL}/article/${a.slug}`;
      const published = new Date(a.publishedAt);
      const pubDate = !Number.isNaN(published.getTime()) ? published.toUTCString() : "";
      return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ""}
      ${a.category ? `<category>${escapeXml(a.category.name)}</category>` : ""}
      <description>${escapeXml(truncate(a.description, 300))}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>en</language>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
