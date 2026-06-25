import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FeatureCard } from "@/components/ArticleCard";
import BlocksRenderer from "@/components/BlocksRenderer";
import ReadingProgress from "@/components/ReadingProgress";
import SectionHeading from "@/components/SectionHeading";
import ShareButtons from "@/components/ShareButtons";
import TableOfContents from "@/components/TableOfContents";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { fetchArticleBySlug, fetchArticles, fetchLatestByCategory } from "@/lib/strapi";
import type { BlockNode } from "@/lib/types";
import { blocksToPlainText, extractToc, formatDate, truncate } from "@/lib/utils";

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * Splits the article body so the standalone content images (filled in by the
 * article generator) appear between sections instead of being dropped.
 */
function interleaveContentImages(
  blocks: BlockNode[],
  images: string[],
): { segments: BlockNode[][]; between: string[]; tail: string[] } {
  if (images.length === 0) return { segments: [blocks], between: [], tail: [] };
  if (blocks.length < 4) return { segments: [blocks], between: [], tail: images };
  const step = Math.ceil(blocks.length / (images.length + 1));
  const segments: BlockNode[][] = [];
  for (let i = 0; i < blocks.length; i += step) {
    segments.push(blocks.slice(i, i + step));
  }
  return { segments, between: images, tail: [] };
}

/** Q/A pairs from the in-content FAQ section, for FAQPage structured data. */
function extractFaq(blocks: BlockNode[]): { q: string; a: string }[] {
  const start = blocks.findIndex(
    (b) =>
      b.type === "heading" &&
      (b.level ?? 2) === 2 &&
      blocksToPlainText([b]).toLowerCase().startsWith("frequently asked"),
  );
  if (start === -1) return [];
  const pairs: { q: string; a: string }[] = [];
  let current: { q: string; a: string } | null = null;
  for (const block of blocks.slice(start + 1)) {
    if (block.type === "heading" && (block.level ?? 2) === 2) break;
    if (block.type === "heading" && block.level === 3) {
      if (current?.a) pairs.push(current);
      current = { q: blocksToPlainText([block]), a: "" };
    } else if (current && block.type === "paragraph") {
      current.a = [current.a, blocksToPlainText([block])].filter(Boolean).join(" ");
    }
  }
  if (current?.a) pairs.push(current);
  return pairs;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchArticleBySlug(slug);
  if (!article) return { robots: { index: false } };

  const description = truncate(article.description, 158);
  const ogImages = article.featuredImage
    ? [
        {
          url: article.featuredImage,
          width: article.featuredImageWidth ?? undefined,
          height: article.featuredImageHeight ?? undefined,
          alt: article.title,
        },
      ]
    : undefined;
  return {
    title: article.title,
    description,
    alternates: { canonical: `${SITE_URL}/article/${slug}` },
    openGraph: {
      type: "article",
      title: article.title,
      description,
      url: `${SITE_URL}/article/${slug}`,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      ...(ogImages ? { images: ogImages } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
      ...(article.featuredImage ? { images: [article.featuredImage] } : {}),
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await fetchArticleBySlug(slug);
  if (!article) notFound();

  const [related, latest] = await Promise.all([
    article.category ? fetchLatestByCategory(article.category.slug, 5) : Promise.resolve([]),
    fetchArticles(9),
  ]);

  const relatedArticles = related.filter((a) => a.slug !== slug).slice(0, 4);
  const moreArticles = latest
    .filter((a) => a.slug !== slug && !relatedArticles.some((r) => r.slug === a.slug))
    .slice(0, 4);

  const articleUrl = `${SITE_URL}/article/${article.slug}`;
  const toc = extractToc(article.content);
  const faq = extractFaq(article.content);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: truncate(article.description, 158),
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    mainEntityOfPage: articleUrl,
    ...(article.featuredImage ? { image: [article.featuredImage] } : {}),
    ...(article.author
      ? {
          author: {
            "@type": "Person",
            "@id": `${SITE_URL}/experts/${article.author.slug}#person`,
            name: article.author.name,
            url: `${SITE_URL}/experts/${article.author.slug}`,
          },
        }
      : {}),
    publisher: { "@id": `${SITE_URL}/#organization` },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      ...(article.category
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: article.category.name,
              item: `${SITE_URL}/category/${article.category.slug}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: article.category ? 3 : 2,
        name: article.title,
        item: articleUrl,
      },
    ],
  };

  const faqLd =
    faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((pair) => ({
            "@type": "Question",
            name: pair.q,
            acceptedAnswer: { "@type": "Answer", text: pair.a },
          })),
        }
      : null;

  const extraImages = [article.contentImage1, article.contentImage2].filter(
    (url): url is string => Boolean(url),
  );
  const { segments, between, tail } = interleaveContentImages(article.content, extraImages);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <ReadingProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      <nav aria-label="Breadcrumb" className="text-xs text-moss">
        <Link href="/" className="hover:text-pine">
          Home
        </Link>
        {article.category && (
          <>
            <span aria-hidden="true" className="mx-1.5">
              /
            </span>
            <Link href={`/category/${article.category.slug}`} className="hover:text-pine">
              {article.category.name}
            </Link>
          </>
        )}
        <span aria-hidden="true" className="mx-1.5">
          /
        </span>
        <span className="text-ink/70">{truncate(article.title, 60)}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="hidden lg:block" aria-label="Article navigation">
          <div className="sticky top-8 space-y-8">
            <TableOfContents items={toc} />
            <div className="rule-dotted pt-5">
              <ShareButtons url={articleUrl} title={article.title} />
            </div>
          </div>
        </aside>

        <article className="min-w-0 max-w-[780px]">
          <header className="reveal">
            {article.category && (
              <Link
                href={`/category/${article.category.slug}`}
                className="inline-block rounded-full bg-pine/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wide text-pine transition-colors hover:bg-pine/20"
              >
                {article.category.name}
              </Link>
            )}
            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {article.title}
            </h1>
            {article.description && (
              <p className="mt-4 text-lg leading-relaxed text-moss">{article.description}</p>
            )}

            <div className="card-lift mt-6 flex flex-wrap items-center justify-between gap-4 border border-line bg-card px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-pine/10 text-lg font-bold text-pine">
                  {article.author?.avatarUrl ? (
                    <Image
                      src={article.author.avatarUrl}
                      alt={article.author.name}
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  ) : (
                    (article.author?.name ?? SITE_NAME).charAt(0)
                  )}
                </span>
                <span>
                  {article.author ? (
                    <Link
                      href={`/experts/${article.author.slug}`}
                      className="block text-sm font-bold hover:text-pine"
                    >
                      {article.author.name}
                    </Link>
                  ) : (
                    <span className="block text-sm font-bold">{SITE_NAME} Editorial</span>
                  )}
                  {article.author?.role && (
                    <span className="block text-xs text-moss">{article.author.role}</span>
                  )}
                </span>
              </div>
              <p className="flex items-center gap-2 text-xs text-moss">
                <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
                <span aria-hidden="true">·</span>
                <span>{article.readingMinutes} min read</span>
                <span aria-hidden="true">·</span>
                <span>{article.views.toLocaleString("en-US")} views</span>
              </p>
            </div>
          </header>

          {article.featuredImage && (
            <figure className="reveal reveal-2 frame-offset relative mt-7 aspect-[16/9] overflow-hidden bg-parchment">
              <Image
                src={article.featuredImage}
                alt={article.title}
                fill
                priority
                sizes="(max-width: 820px) 100vw, 780px"
                className="object-cover"
              />
            </figure>
          )}

          {toc.length >= 2 && (
            <details className="mt-7 rounded-md border border-line bg-card p-4 lg:hidden">
              <summary className="cursor-pointer text-sm font-bold">On this page</summary>
              <div className="mt-3">
                <TableOfContents items={toc} />
              </div>
            </details>
          )}

          <div className="article-content reveal reveal-3 mt-8">
            {segments.map((segment, i) => (
              <div key={i}>
                <BlocksRenderer blocks={segment} />
                {i < segments.length - 1 && between[i] && (
                  <figure className="relative my-8 aspect-[16/9] overflow-hidden rounded-md border border-line bg-parchment">
                    <Image
                      src={between[i]}
                      alt={`${article.title} — illustration ${i + 1}`}
                      fill
                      sizes="(max-width: 820px) 100vw, 780px"
                      className="object-cover"
                    />
                  </figure>
                )}
              </div>
            ))}
            {tail.map((url, i) => (
              <figure
                key={url}
                className="relative my-8 aspect-[16/9] overflow-hidden rounded-md border border-line bg-parchment"
              >
                <Image
                  src={url}
                  alt={`${article.title} — illustration ${i + 1}`}
                  fill
                  sizes="(max-width: 820px) 100vw, 780px"
                  className="object-cover"
                />
              </figure>
            ))}
          </div>

          <div className="rule-dotted mt-10 flex flex-wrap items-center justify-between gap-4 pt-6">
            {article.tags.length > 0 ? (
              <ul aria-label="Tags" className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full border border-line bg-card px-3 py-1 text-xs font-semibold text-moss"
                  >
                    #{tag}
                  </li>
                ))}
              </ul>
            ) : (
              <span />
            )}
            <ShareButtons url={articleUrl} title={article.title} />
          </div>

          {article.author && (
            <aside className="card-lift mt-8 flex items-center gap-5 border border-line bg-card p-6">
              <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-pine/10 text-2xl font-bold text-pine">
                {article.author.avatarUrl ? (
                  <Image
                    src={article.author.avatarUrl}
                    alt={article.author.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : (
                  article.author.name.charAt(0)
                )}
              </span>
              <div>
                <p className="tag-cap">Written by</p>
                <Link
                  href={`/experts/${article.author.slug}`}
                  className="text-lg font-bold hover:text-pine"
                >
                  {article.author.name}
                </Link>
                {article.author.role && (
                  <p className="text-sm text-moss">{article.author.role}</p>
                )}
                {article.author.bio && article.author.bio.length > 0 && (
                  <p className="mt-1 text-sm leading-relaxed text-moss">
                    {truncate(blocksToPlainText(article.author.bio), 160)}
                  </p>
                )}
              </div>
            </aside>
          )}
        </article>
      </div>

      {relatedArticles.length > 0 && article.category && (
        <section aria-labelledby="related-heading" className="mt-16">
          <SectionHeading
            title={`More in ${article.category.name}`}
            href={`/category/${article.category.slug}`}
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {relatedArticles.map((a) => (
              <FeatureCard key={a.slug} article={a} />
            ))}
          </div>
        </section>
      )}

      {moreArticles.length > 0 && (
        <section aria-labelledby="more-heading" className="mt-14">
          <SectionHeading title="Keep exploring" href="/" hrefLabel="Home" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {moreArticles.map((a) => (
              <FeatureCard key={a.slug} article={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
