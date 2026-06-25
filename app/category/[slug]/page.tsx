import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListCard, RowCard } from "@/components/ArticleCard";
import EmptyState from "@/components/EmptyState";
import Pagination from "@/components/Pagination";
import { CATEGORIES, categoryIndex, getCategory, SITE_URL } from "@/lib/config";
import { fetchArticles, fetchArticlesByCategory } from "@/lib/strapi";

export const revalidate = 300;

const PAGE_SIZE = 10;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) return {};

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const canonical =
    page > 1 ? `${SITE_URL}/category/${slug}?page=${page}` : `${SITE_URL}/category/${slug}`;
  const title =
    page > 1
      ? `${category.name} — Guides & Explainers (Page ${page})`
      : `${category.name} — Guides & Explainers`;
  const description =
    page > 1
      ? `${category.blurb} Page ${page} of the ${category.name} archive.`
      : category.blurb;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
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

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ items, pageCount, total }, latest] = await Promise.all([
    fetchArticlesByCategory(slug, page, PAGE_SIZE),
    fetchArticles(6),
  ]);

  if (page > 1 && items.length === 0) notFound();

  const latestOther = latest.filter((a) => a.category?.slug !== slug).slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="reveal rule-double pb-6">
        <nav aria-label="Breadcrumb" className="text-xs text-moss">
          <Link href="/" className="hover:text-pine">
            Home
          </Link>
          <span aria-hidden="true" className="mx-1.5">
            /
          </span>
          <span>{category.name}</span>
        </nav>
        <div className="mt-4 flex items-baseline gap-5">
          <span className="chapter-num">{categoryIndex(slug)}</span>
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {category.name}
            </h1>
            <p className="mt-2 max-w-2xl leading-relaxed text-moss">{category.blurb}</p>
            {total > 0 && (
              <p className="tag-cap mt-3">
                {total} {total === 1 ? "article" : "articles"}
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_300px]">
        <div className="reveal reveal-2">
          <h2 className="sr-only">Articles in {category.name}</h2>
          {items.length > 0 ? (
            <>
              <div className="space-y-6">
                {items.map((article) => (
                  <ListCard key={article.slug} article={article} />
                ))}
              </div>
              <Pagination basePath={`/category/${slug}`} page={page} pageCount={pageCount} />
            </>
          ) : (
            <EmptyState
              title={`No ${category.name} articles yet`}
              note="This chapter is still being written. The first guides will appear here soon."
            />
          )}
        </div>

        <aside aria-label="More reading" className="reveal reveal-3 lg:border-l lg:border-line lg:pl-8">
          {latestOther.length > 0 && (
            <>
              <h2 className="tag-cap rule-double pb-3">Latest elsewhere</h2>
              <div className="divide-y divide-line">
                {latestOther.map((article) => (
                  <RowCard key={article.slug} article={article} />
                ))}
              </div>
            </>
          )}

          <h2 className="tag-cap rule-double mt-10 pb-3">All sections</h2>
          <ul className="mt-3 space-y-2.5">
            {CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/category/${c.slug}`}
                  className={`text-sm font-semibold transition-colors hover:text-pine ${
                    c.slug === slug ? "text-pine" : ""
                  }`}
                >
                  {c.slug === slug ? <span className="u-marker">{c.name}</span> : c.name}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
