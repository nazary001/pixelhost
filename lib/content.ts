import { cache } from "react";
import type { Document, Filter, Sort } from "mongodb";
import { coll, newDoc } from "@/lib/mongo";
import type { Article, Author, BlockNode, Category, Paginated } from "@/lib/types";
import { readingMinutes } from "@/lib/utils";

// Media URLs stored in the database are absolute (rewritten to the S3 bucket
// during the Strapi → MongoDB migration); the base only serves the
// relative-path fallback below.
const MEDIA_BASE_URL = (process.env.MEDIA_BASE_URL ?? "").replace(/\/+$/, "");

// One shared database serves several sites (nice-advice family).
// This site reads only from its own post4 / category4 / author4 collections.
const ARTICLES = "post4s";
const AUTHORS = "author4s";
const CATEGORIES = "category4s";
const CONTACTS = "contact4s";

// Draft & Publish: public readers only ever see documents with a publishedAt
// (`$ne: null` also excludes documents where the field is missing).
const PUBLISHED = { publishedAt: { $ne: null } };
const SORT_NEWEST: Sort = { publishedAt: -1, id: -1 };
// Slow database responses must never hang ISR/sitemap generation, and the
// timeout has to fit inside serverless function limits (Vercel).
const MAX_TIME_MS = 8000;

interface MediaDoc {
  url?: string | null;
  width?: number | null;
  height?: number | null;
}

/** Relation reference as stored by the migration: `{ id, documentId }`. */
interface Ref {
  id?: number;
  documentId?: string;
}

interface ArticleDoc extends Document {
  id: number;
  documentId: string;
  title?: string | null;
  slug?: string | null;
  description?: string | null;
  content?: BlockNode[] | null;
  featuredImage?: MediaDoc | null;
  contentImage1?: MediaDoc | null;
  contentImage2?: MediaDoc | null;
  views?: string | number | null;
  tags?: unknown;
  publishedAt?: Date | string | null;
  updatedAt?: Date | string | null;
  category?: Ref | null;
  author?: Ref | null;
}

interface CategoryDoc extends Document {
  documentId: string;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
}

interface AuthorDoc extends Document {
  documentId: string;
  name?: string | null;
  slug?: string | null;
  role?: string | null;
  bio?: BlockNode[] | null;
  avatar?: MediaDoc | null;
}

/**
 * Keeps the old CMS contract: any database failure yields the empty result
 * (callers render empty states / notFound) instead of a 500.
 */
async function safe<T>(label: string, fallback: T, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[content] ${label} failed:`, err instanceof Error ? err.message : err);
    return fallback;
  }
}

function toIso(value: Date | string | null | undefined): string {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  return typeof value === "string" ? value : "";
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mediaUrl(media: MediaDoc | null | undefined): string | null {
  const url = media?.url;
  if (!url) return null;
  return url.startsWith("http") ? url : `${MEDIA_BASE_URL}${url}`;
}

/** Media inside `blocks` JSON carries the same relative-URL caveat as top-level media. */
function absolutizeBlockImages(blocks: BlockNode[]): BlockNode[] {
  return blocks.map((node) => {
    const next: BlockNode = { ...node };
    if (next.image?.url && !next.image.url.startsWith("http")) {
      next.image = { ...next.image, url: `${MEDIA_BASE_URL}${next.image.url}` };
    }
    if (Array.isArray(next.children)) {
      next.children = absolutizeBlockImages(next.children);
    }
    return next;
  });
}

function formatCategory(raw: CategoryDoc | null | undefined): Category | null {
  if (!raw?.name || !raw?.slug) return null;
  return { name: raw.name, slug: raw.slug, description: raw.description ?? null };
}

function formatAuthor(raw: AuthorDoc | null | undefined): Author | null {
  if (!raw?.name || !raw?.slug) return null;
  return {
    name: raw.name,
    slug: raw.slug,
    role: raw.role ?? null,
    bio: Array.isArray(raw.bio) ? absolutizeBlockImages(raw.bio) : null,
    avatarUrl: mediaUrl(raw.avatar),
  };
}

function formatArticle(
  raw: ArticleDoc,
  category: CategoryDoc | undefined,
  author: AuthorDoc | undefined,
): Article | null {
  if (!raw?.title || !raw?.slug) return null;
  const content = Array.isArray(raw.content) ? absolutizeBlockImages(raw.content) : [];
  const publishedAt = toIso(raw.publishedAt);
  // Strapi stamped updatedAt a few ms before the publish transaction wrote
  // publishedAt; clamp so dateModified is never earlier than datePublished.
  let updatedAt = toIso(raw.updatedAt);
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
    category: formatCategory(category),
    author: formatAuthor(author),
    tags: Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === "string") : [],
    views: Number(raw.views ?? 0) || 0,
    readingMinutes: readingMinutes(content),
    publishedAt,
    updatedAt,
  };
}

function refIds(docs: ArticleDoc[], key: "category" | "author"): string[] {
  const ids = new Set<string>();
  for (const doc of docs) {
    const id = doc[key]?.documentId;
    if (id) ids.add(id);
  }
  return [...ids];
}

/**
 * Strapi's `populate=category,author.avatar`: relations are stored as
 * `{ id, documentId }` refs, so the (published) targets are loaded with a
 * second query and joined here.
 */
async function populate(docs: ArticleDoc[]): Promise<Article[]> {
  const categoryIds = refIds(docs, "category");
  const authorIds = refIds(docs, "author");
  const [categories, authors] = await Promise.all([
    categoryIds.length
      ? (await coll<CategoryDoc>(CATEGORIES))
          .find({ ...PUBLISHED, documentId: { $in: categoryIds } }, { maxTimeMS: MAX_TIME_MS })
          .toArray()
      : [],
    authorIds.length
      ? (await coll<AuthorDoc>(AUTHORS))
          .find({ ...PUBLISHED, documentId: { $in: authorIds } }, { maxTimeMS: MAX_TIME_MS })
          .toArray()
      : [],
  ]);
  const categoryBy = new Map(categories.map((c) => [c.documentId, c]));
  const authorBy = new Map(authors.map((a) => [a.documentId, a]));
  return docs
    .map((doc) =>
      formatArticle(
        doc,
        categoryBy.get(doc.category?.documentId ?? ""),
        authorBy.get(doc.author?.documentId ?? ""),
      ),
    )
    .filter((a): a is Article => a !== null);
}

async function findArticles(
  filter: Filter<ArticleDoc>,
  { skip = 0, limit = 0 }: { skip?: number; limit?: number } = {},
): Promise<ArticleDoc[]> {
  const cursor = (await coll<ArticleDoc>(ARTICLES))
    .find(filter, { maxTimeMS: MAX_TIME_MS })
    .sort(SORT_NEWEST);
  if (skip > 0) cursor.skip(skip);
  if (limit > 0) cursor.limit(limit);
  return cursor.toArray();
}

/** Strapi-style page/pageSize listing (`meta.pagination`): pageCount = ceil(total / pageSize). */
async function findPage(
  filter: Filter<ArticleDoc>,
  page: number,
  pageSize: number,
): Promise<Paginated<Article>> {
  const [total, docs] = await Promise.all([
    (await coll<ArticleDoc>(ARTICLES)).countDocuments(filter, { maxTimeMS: MAX_TIME_MS }),
    findArticles(filter, { skip: (page - 1) * pageSize, limit: pageSize }),
  ]);
  return { items: await populate(docs), page, pageCount: Math.ceil(total / pageSize), total };
}

const emptyPage = (page: number, pageCount: number): Paginated<Article> => ({
  items: [],
  page,
  pageCount,
  total: 0,
});

const categoryBySlug = cache(async (slug: string) =>
  (await coll<CategoryDoc>(CATEGORIES)).findOne({ ...PUBLISHED, slug }, { maxTimeMS: MAX_TIME_MS }),
);

const authorBySlug = cache(async (slug: string) =>
  (await coll<AuthorDoc>(AUTHORS)).findOne({ ...PUBLISHED, slug }, { maxTimeMS: MAX_TIME_MS }),
);

/** Newest articles across all categories. */
export const fetchArticles = cache(async (limit = 24): Promise<Article[]> =>
  safe("fetchArticles", [], async () => populate(await findArticles(PUBLISHED, { limit }))),
);

export const fetchArticleBySlug = cache(async (slug: string): Promise<Article | null> =>
  safe("fetchArticleBySlug", null, async () => {
    const doc = await (await coll<ArticleDoc>(ARTICLES)).findOne(
      { ...PUBLISHED, slug },
      { maxTimeMS: MAX_TIME_MS },
    );
    return doc ? ((await populate([doc]))[0] ?? null) : null;
  }),
);

export async function fetchArticlesByCategory(
  categorySlug: string,
  page = 1,
  pageSize = 10,
): Promise<Paginated<Article>> {
  return safe("fetchArticlesByCategory", emptyPage(page, 1), async () => {
    const category = await categoryBySlug(categorySlug);
    if (!category) return emptyPage(page, 0);
    return findPage({ ...PUBLISHED, "category.documentId": category.documentId }, page, pageSize);
  });
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
  return safe("searchArticles", emptyPage(page, 1), async () => {
    // Strapi `$containsi`: case-insensitive substring match on title or description.
    const pattern = new RegExp(escapeRegExp(query), "i");
    return findPage(
      { ...PUBLISHED, $or: [{ title: pattern }, { description: pattern }] },
      page,
      pageSize,
    );
  });
}

export async function fetchArticlesByAuthor(
  authorSlug: string,
  limit = 50,
): Promise<Article[]> {
  return safe("fetchArticlesByAuthor", [], async () => {
    const author = await authorBySlug(authorSlug);
    if (!author) return [];
    return populate(
      await findArticles({ ...PUBLISHED, "author.documentId": author.documentId }, { limit }),
    );
  });
}

export const fetchAuthors = cache(async (): Promise<Author[]> =>
  safe("fetchAuthors", [], async () => {
    const docs = await (await coll<AuthorDoc>(AUTHORS))
      .find(PUBLISHED, { maxTimeMS: MAX_TIME_MS })
      .collation({ locale: "en" })
      .sort({ name: 1 })
      .limit(100)
      .toArray();
    return docs.map(formatAuthor).filter((a): a is Author => a !== null);
  }),
);

export const fetchAuthorBySlug = cache(async (slug: string): Promise<Author | null> =>
  safe("fetchAuthorBySlug", null, async () => formatAuthor(await authorBySlug(slug))),
);

/** Every published article; used by the sitemap. */
export async function fetchAllArticles(): Promise<Article[]> {
  return safe("fetchAllArticles", [], async () => populate(await findArticles(PUBLISHED)));
}

export async function submitContact(data: {
  name: string;
  email: string;
  request: string;
}): Promise<boolean> {
  return safe("submitContact", false, async () => {
    const now = new Date();
    // Strapi stamped publishedAt on this (non Draft & Publish) type as well;
    // keep the row shape identical to the migrated submissions.
    const doc = await newDoc(CONTACTS, { ...data, publishedAt: now }, { now });
    await (await coll(CONTACTS)).insertOne(doc);
    return true;
  });
}
