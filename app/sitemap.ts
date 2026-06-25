import type { MetadataRoute } from "next";
import { CATEGORIES, SITE_URL } from "@/lib/config";
import { fetchAllArticles, fetchAuthors } from "@/lib/strapi";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, authors] = await Promise.all([fetchAllArticles(), fetchAuthors()]);

  const newestByCategory = new Map<string, string>();
  let newestOverall: string | undefined;
  for (const article of articles) {
    const date = article.updatedAt || article.publishedAt;
    if (!date) continue;
    if (!newestOverall || date > newestOverall) newestOverall = date;
    const slug = article.category?.slug;
    if (slug && date > (newestByCategory.get(slug) ?? "")) {
      newestByCategory.set(slug, date);
    }
  }

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: newestOverall, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/experts`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy-policy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms-of-use`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const categoryPages: MetadataRoute.Sitemap = CATEGORIES.map((c) => ({
    url: `${SITE_URL}/category/${c.slug}`,
    lastModified: newestByCategory.get(c.slug),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const articlePages: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${SITE_URL}/article/${a.slug}`,
    lastModified: a.updatedAt || a.publishedAt || undefined,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const authorPages: MetadataRoute.Sitemap = authors.map((a) => ({
    url: `${SITE_URL}/experts/${a.slug}`,
    changeFrequency: "weekly",
    priority: 0.4,
  }));

  return [...staticPages, ...categoryPages, ...articlePages, ...authorPages];
}
