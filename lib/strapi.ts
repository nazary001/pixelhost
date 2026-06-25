import { cache } from "react";
import type { Article, Author, BlockNode, Category, Paginated } from "@/lib/types";
import { readingMinutes } from "@/lib/utils";

const STRAPI_URL = (process.env.STRAPI_API_URL ?? "").replace(/\/+$/, "");
const STRAPI_TOKEN = process.env.STRAPI_TOKEN ?? "";

// One shared Strapi instance serves several sites (nice-advice family).
// This site reads only from its own post4 / author4 collections.
const ARTICLES = "post4s";
const AUTHORS = "author4s";
const CONTACTS = "contact4s";

const LIST_POPULATE =
  "populate[0]=category&populate[1]=author.avatar&populate[2]=featuredImage";
const FULL_POPULATE = `${LIST_POPULATE}&populate[3]=contentImage1&populate[4]=contentImage2`;
const SORT_NEWEST = "sort[0]=publishedAt:desc";

interface StrapiPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

interface StrapiListResponse {
  data: StrapiArticle[];
  meta?: { pagination?: StrapiPagination };
}

interface StrapiMedia {
  url?: string | null;
  width?: number | null;
  height?: number | null;
}

interface StrapiArticle {
  id: number;
  documentId: string;
  title?: string;
  slug?: string;
  description?: string;
  content?: BlockNode[];
  featuredImage?: StrapiMedia | null;
  contentImage1?: StrapiMedia | null;
  contentImage2?: StrapiMedia | null;
  views?: string | number;
  tags?: unknown;
  publishedAt?: string;
  updatedAt?: string;
  category?: { name?: string; slug?: string; description?: string | null } | null;
  author?: StrapiAuthor | null;
}

interface StrapiAuthor {
  id?: number;
  documentId?: string;
  name?: string;
  slug?: string;
  role?: string | null;
  bio?: BlockNode[] | null;
  avatar?: StrapiMedia | null;
}

async function strapiGet<T>(
  path: string,
  query: string,
  revalidate = 300,
): Promise<T | null> {
  if (!STRAPI_URL) return null;
  try {
    const res = await fetch(`${STRAPI_URL}/api/${path}?${query}`, {
      // Public read on the nice-advice family Strapi; token optional.
      headers: STRAPI_TOKEN ? { Authorization: `Bearer ${STRAPI_TOKEN}` } : {},
      next: { revalidate },
      // Slow CMS responses must never hang ISR/sitemap generation, and the
      // timeout has to fit inside serverless function limits (Vercel).
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function mediaUrl(media: StrapiMedia | null | undefined): string | null {
  const url = media?.url;
  if (!url) return null;
  // Strapi Cloud returns absolute URLs; self-hosted setups return paths.
  return url.startsWith("http") ? url : `${STRAPI_URL}${url}`;
}

/** Media inside `blocks` JSON carries the same relative-URL caveat as top-level media. */
function absolutizeBlockImages(blocks: BlockNode[]): BlockNode[] {
  return blocks.map((node) => {
    const next: BlockNode = { ...node };
    if (next.image?.url && !next.image.url.startsWith("http")) {
      next.image = { ...next.image, url: `${STRAPI_URL}${next.image.url}` };
    }
    if (Array.isArray(next.children)) {
      next.children = absolutizeBlockImages(next.children);
    }
    return next;
  });
}

function formatCategory(raw: StrapiArticle["category"]): Category | null {
  if (!raw?.name || !raw?.slug) return null;
  return { name: raw.name, slug: raw.slug, description: raw.description ?? null };
}

function formatAuthor(raw: StrapiAuthor | null | undefined): Author | null {
  if (!raw?.name || !raw?.slug) return null;
  return {
    name: raw.name,
    slug: raw.slug,
    role: raw.role ?? null,
    bio: Array.isArray(raw.bio) ? absolutizeBlockImages(raw.bio) : null,
    avatarUrl: mediaUrl(raw.avatar),
  };
}

function formatArticle(raw: StrapiArticle): Article | null {
  if (!raw?.title || !raw?.slug) return null;
  const content = Array.isArray(raw.content) ? absolutizeBlockImages(raw.content) : [];
  const publishedAt = raw.publishedAt ?? "";
  // Strapi stamps updatedAt a few ms before the publish transaction writes
  // publishedAt; clamp so dateModified is never earlier than datePublished.
  let updatedAt = raw.updatedAt ?? "";
  if (publishedAt && updatedAt && updatedAt < publishedAt) updatedAt = publishedAt;
  return {
    id: raw.id,
    documentId: raw.documentId,
    title: raw.title,
    slug: raw.slug,
    description: raw.description ?? "",
    content,
    featuredImage: mediaUrl(raw.featuredImage),
    featuredImageWidth: raw.featuredImage?.width ?? null,
    featuredImageHeight: raw.featuredImage?.height ?? null,
    contentImage1: mediaUrl(raw.contentImage1),
    contentImage2: mediaUrl(raw.contentImage2),
    category: formatCategory(raw.category),
    author: formatAuthor(raw.author),
    tags: Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === "string") : [],
    views: Number(raw.views ?? 0) || 0,
    readingMinutes: readingMinutes(content),
    publishedAt,
    updatedAt,
  };
}

function formatList(res: StrapiListResponse | null): Article[] {
  if (!Array.isArray(res?.data)) return [];
  return res.data
    .map(formatArticle)
    .filter((a): a is Article => a !== null);
}

/** Newest articles across all categories. */
export const fetchArticles = cache(async (limit = 24): Promise<Article[]> => {
  const res = await strapiGet<StrapiListResponse>(
    ARTICLES,
    `${LIST_POPULATE}&${SORT_NEWEST}&pagination[pageSize]=${limit}`,
  );
  return formatList(res);
});

export const fetchArticleBySlug = cache(
  async (slug: string): Promise<Article | null> => {
    const res = await strapiGet<StrapiListResponse>(
      ARTICLES,
      `filters[slug][$eq]=${encodeURIComponent(slug)}&${FULL_POPULATE}`,
    );
    return formatList(res)[0] ?? null;
  },
);

export async function fetchArticlesByCategory(
  categorySlug: string,
  page = 1,
  pageSize = 10,
): Promise<Paginated<Article>> {
  const res = await strapiGet<StrapiListResponse>(
    ARTICLES,
    `filters[category][slug][$eq]=${encodeURIComponent(categorySlug)}&${LIST_POPULATE}&${SORT_NEWEST}&pagination[page]=${page}&pagination[pageSize]=${pageSize}`,
  );
  const pagination = res?.meta?.pagination;
  return {
    items: formatList(res),
    page: pagination?.page ?? page,
    pageCount: pagination?.pageCount ?? 1,
    total: pagination?.total ?? 0,
  };
}

export async function fetchLatestByCategory(
  categorySlug: string,
  limit = 4,
): Promise<Article[]> {
  const { items } = await fetchArticlesByCategory(categorySlug, 1, limit);
  return items;
}

export async function searchArticles(
  query: string,
  page = 1,
  pageSize = 10,
): Promise<Paginated<Article>> {
  const q = encodeURIComponent(query);
  const res = await strapiGet<StrapiListResponse>(
    ARTICLES,
    `filters[$or][0][title][$containsi]=${q}&filters[$or][1][description][$containsi]=${q}&${LIST_POPULATE}&${SORT_NEWEST}&pagination[page]=${page}&pagination[pageSize]=${pageSize}`,
    60,
  );
  const pagination = res?.meta?.pagination;
  return {
    items: formatList(res),
    page: pagination?.page ?? page,
    pageCount: pagination?.pageCount ?? 1,
    total: pagination?.total ?? 0,
  };
}

export async function fetchArticlesByAuthor(
  authorSlug: string,
  limit = 50,
): Promise<Article[]> {
  const res = await strapiGet<StrapiListResponse>(
    ARTICLES,
    `filters[author][slug][$eq]=${encodeURIComponent(authorSlug)}&${LIST_POPULATE}&${SORT_NEWEST}&pagination[pageSize]=${limit}`,
  );
  return formatList(res);
}

export const fetchAuthors = cache(async (): Promise<Author[]> => {
  const res = await strapiGet<{ data: StrapiAuthor[] }>(
    AUTHORS,
    "populate=avatar&sort[0]=name:asc&pagination[pageSize]=100",
  );
  if (!Array.isArray(res?.data)) return [];
  return res.data
    .map(formatAuthor)
    .filter((a): a is Author => a !== null);
});

export const fetchAuthorBySlug = cache(
  async (slug: string): Promise<Author | null> => {
    const res = await strapiGet<{ data: StrapiAuthor[] }>(
      AUTHORS,
      `filters[slug][$eq]=${encodeURIComponent(slug)}&populate=avatar`,
    );
    if (!Array.isArray(res?.data)) return null;
    return formatAuthor(res.data[0]) ?? null;
  },
);

/** Walks every page of the collection; used by sitemap and RSS. */
export async function fetchAllArticles(): Promise<Article[]> {
  const all: Article[] = [];
  let page = 1;
  let pageCount = 1;
  do {
    const res = await strapiGet<StrapiListResponse>(
      ARTICLES,
      `${LIST_POPULATE}&${SORT_NEWEST}&pagination[page]=${page}&pagination[pageSize]=100`,
      3600,
    );
    if (!res) break;
    all.push(...formatList(res));
    pageCount = res.meta?.pagination?.pageCount ?? 1;
    page += 1;
  } while (page <= pageCount);
  return all;
}

export async function submitContact(data: {
  name: string;
  email: string;
  request: string;
}): Promise<boolean> {
  if (!STRAPI_URL) return false;
  try {
    const res = await fetch(`${STRAPI_URL}/api/${CONTACTS}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(STRAPI_TOKEN ? { Authorization: `Bearer ${STRAPI_TOKEN}` } : {}),
      },
      body: JSON.stringify({ data }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
