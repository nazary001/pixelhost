import type { Metadata } from "next";
import Link from "next/link";
import { FeatureCard, HeroCard, RowCard } from "@/components/ArticleCard";
import EmptyState from "@/components/EmptyState";
import SectionHeading from "@/components/SectionHeading";
import { CATEGORIES, SITE_NAME, SITE_TAGLINE } from "@/lib/config";
import { fetchArticles, fetchLatestByCategory } from "@/lib/strapi";
import type { Article } from "@/lib/types";

export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

function CategoryBlock({
  name,
  slug,
  articles,
}: {
  name: string;
  slug: string;
  articles: Article[];
}) {
  if (articles.length === 0) return null;
  return (
    <section aria-labelledby={`section-${slug}`} className="mt-14">
      <SectionHeading title={name} href={`/category/${slug}`} />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {articles.map((article) => (
          <FeatureCard key={article.slug} article={article} />
        ))}
      </div>
    </section>
  );
}

export default async function HomePage() {
  const [latest, ...byCategory] = await Promise.all([
    fetchArticles(24),
    ...CATEGORIES.map((c) => fetchLatestByCategory(c.slug, 4)),
  ]);

  const hero = latest[0];
  const gridArticles = latest.slice(1, 7);
  const readMore = latest.slice(7, 10);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <section aria-label="Featured stories" className="reveal min-w-0">
          {hero ? (
            <>
              <HeroCard article={hero} />
              {gridArticles.length > 0 && (
                <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {gridArticles.map((article) => (
                    <FeatureCard key={article.slug} article={article} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="card-lift border border-line bg-card p-8 text-center sm:p-12">
              <p className="tag-cap">{SITE_TAGLINE}</p>
              <h1 className="mx-auto mt-3 max-w-xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                Welcome to <span className="u-marker">{SITE_NAME}</span>
              </h1>
              <p className="mx-auto mt-4 max-w-lg leading-relaxed text-moss">
                Plain-language guides, reviews and how-tos on web hosting,
                domains, WordPress and building your website — so you can get
                online faster and keep your site fast and secure.
              </p>
              <div className="mt-8">
                <EmptyState
                  title="The first guides are in progress"
                  note="Our editors are preparing the first batch of articles. Check the sections below to see what's coming."
                />
              </div>
            </div>
          )}
        </section>

        <aside
          aria-label="Browse topics and more reading"
          className="reveal reveal-2 min-w-0 space-y-6"
        >
          <div className="card-lift border border-line bg-card p-5">
            <h2 className="rule-double pb-3 text-lg font-bold">Topics</h2>
            <ul className="divide-y divide-line">
              {CATEGORIES.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/category/${category.slug}`}
                    className="group flex items-center justify-between gap-3 py-3"
                  >
                    <span className="font-semibold">
                      <span className="u-marker-hover">{category.name}</span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="text-pine transition-transform group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {readMore.length > 0 && (
            <div className="card-lift border border-line bg-card p-5">
              <h2 className="rule-double pb-3 text-lg font-bold">Read more</h2>
              <div className="divide-y divide-line">
                {readMore.map((article) => (
                  <RowCard key={article.slug} article={article} />
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {CATEGORIES.map((category, i) => (
        <CategoryBlock
          key={category.slug}
          name={category.name}
          slug={category.slug}
          articles={byCategory[i] ?? []}
        />
      ))}

      {!hero && (
        <section
          aria-label="Sections"
          className="reveal reveal-3 mt-14 grid gap-6 sm:grid-cols-2"
        >
          {CATEGORIES.map((category) => (
            <a
              key={category.slug}
              href={`/category/${category.slug}`}
              className="card-lift group border border-line bg-card p-6"
            >
              <h2 className="text-xl font-bold">
                <span className="u-marker-hover">{category.name}</span>
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-moss">
                {category.blurb}
              </p>
              <span className="mt-3 inline-block text-sm font-semibold text-pine">
                Browse section{" "}
                <span
                  aria-hidden="true"
                  className="inline-block transition-transform group-hover:translate-x-1"
                >
                  →
                </span>
              </span>
            </a>
          ))}
        </section>
      )}
    </div>
  );
}
