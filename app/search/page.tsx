import type { Metadata } from "next";
import Link from "next/link";
import { ListCard } from "@/components/ArticleCard";
import EmptyState from "@/components/EmptyState";
import Pagination from "@/components/Pagination";
import { CATEGORIES } from "@/lib/config";
import { searchArticles } from "@/lib/strapi";

export const metadata: Metadata = {
  title: "Search",
  description: "Search every guide, explainer and review on the site.",
  robots: { index: false },
};

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const query = (sp.q ?? "").trim().slice(0, 100);
  const page = Math.max(1, Number(sp.page) || 1);

  const results = query
    ? await searchArticles(query, page, 10)
    : { items: [], page: 1, pageCount: 1, total: 0 };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="reveal rule-double pb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Search the <span className="u-marker">archive</span>
        </h1>
        <form action="/search" role="search" className="mt-6 flex items-center gap-2">
          <input
            type="search"
            name="q"
            defaultValue={query}
            required
            placeholder="Try “VPS vs shared hosting” or “point a domain to WordPress”…"
            aria-label="Search articles"
            className="field"
          />
          <button type="submit" className="btn-pine shrink-0">
            Search
          </button>
        </form>
      </header>

      <div className="reveal reveal-2 mt-8">
        <h2 className="sr-only">Search results</h2>
        {query ? (
          results.items.length > 0 ? (
            <>
              <p className="tag-cap mb-6">
                {results.total} {results.total === 1 ? "result" : "results"} for “{query}”
              </p>
              <div className="space-y-6">
                {results.items.map((article) => (
                  <ListCard key={article.slug} article={article} />
                ))}
              </div>
              <Pagination
                basePath={`/search?q=${encodeURIComponent(query)}`}
                page={results.page}
                pageCount={results.pageCount}
              />
            </>
          ) : (
            <>
              <EmptyState
                title={`Nothing found for “${query}”`}
                note="Try a shorter phrase, or browse one of the sections below."
              />
              <ul className="mt-8 flex flex-wrap justify-center gap-3">
                {CATEGORIES.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/category/${c.slug}`}
                      className="border border-line bg-card px-4 py-2 text-sm font-semibold transition-colors hover:border-pine hover:text-pine"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )
        ) : (
          <p className="text-center text-sm text-moss">
            Type a topic above to search every article on the site.
          </p>
        )}
      </div>
    </div>
  );
}
