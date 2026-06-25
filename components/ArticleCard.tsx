import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/lib/types";
import { formatDate, truncate } from "@/lib/utils";

function CardImage({
  article,
  sizes,
  priority = false,
}: {
  article: Article;
  sizes: string;
  priority?: boolean;
}) {
  if (article.featuredImage) {
    return (
      <Image
        src={article.featuredImage}
        alt={article.title}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center bg-parchment"
    >
      <span className="font-display text-6xl font-semibold text-line">
        {article.title.charAt(0).toUpperCase()}
      </span>
    </span>
  );
}

function Meta({ article }: { article: Article }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-xs text-moss">
      <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
      <span aria-hidden="true">·</span>
      <span>{article.readingMinutes} min read</span>
    </p>
  );
}

/** Big homepage lead story: image on top, title and meta below. */
export function HeroCard({ article }: { article: Article }) {
  return (
    <article className="group card-lift border border-line bg-card">
      <Link
        href={`/article/${article.slug}`}
        className="relative block aspect-[2/1] overflow-hidden"
        aria-label={article.title}
        tabIndex={-1}
      >
        <CardImage article={article} sizes="(max-width: 1024px) 100vw, 66vw" priority />
      </Link>
      <div className="p-5 sm:p-6">
        {article.category && (
          <Link href={`/category/${article.category.slug}`} className="tag-cap hover:underline">
            {article.category.name}
          </Link>
        )}
        <h1 className="mt-2 text-2xl font-bold leading-snug tracking-tight sm:text-3xl">
          <Link href={`/article/${article.slug}`}>
            <span className="u-marker-hover">{article.title}</span>
          </Link>
        </h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-moss">
          {truncate(article.description, 180)}
        </p>
        <div className="mt-4">
          <Meta article={article} />
        </div>
      </div>
    </article>
  );
}

/** Standard vertical card for grids. */
export function FeatureCard({ article }: { article: Article }) {
  return (
    <article className="group card-lift flex h-full flex-col border border-line bg-card">
      <Link
        href={`/article/${article.slug}`}
        className="relative block aspect-[16/10] overflow-hidden border-b border-line"
        aria-label={article.title}
        tabIndex={-1}
      >
        <CardImage article={article} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        {article.category && (
          <Link href={`/category/${article.category.slug}`} className="tag-cap hover:underline">
            {article.category.name}
          </Link>
        )}
        <h3 className="mt-2 font-display text-lg font-semibold leading-snug">
          <Link href={`/article/${article.slug}`}>
            <span className="u-marker-hover">{article.title}</span>
          </Link>
        </h3>
        <div className="mt-auto pt-4">
          <Meta article={article} />
        </div>
      </div>
    </article>
  );
}

/** Compact horizontal row for sidebars ("Read more" lists). */
export function RowCard({ article }: { article: Article }) {
  return (
    <article className="group flex items-start gap-4 py-4">
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold leading-snug">
          <Link href={`/article/${article.slug}`} className="hover:text-pine">
            {article.title}
          </Link>
        </h3>
        <div className="mt-1.5">
          <Meta article={article} />
        </div>
        <Link
          href={`/article/${article.slug}`}
          className="mt-1.5 inline-block text-xs font-semibold text-pine hover:text-pine-deep"
        >
          Read more{" "}
          <span
            aria-hidden="true"
            className="inline-block transition-transform group-hover:translate-x-0.5"
          >
            →
          </span>
        </Link>
      </div>
      <Link
        href={`/article/${article.slug}`}
        className="relative block h-[72px] w-[72px] shrink-0 overflow-hidden rounded-md border border-line bg-parchment"
        aria-label={article.title}
        tabIndex={-1}
      >
        <CardImage article={article} sizes="72px" />
      </Link>
    </article>
  );
}

/** Wide listing card for category, search and author pages. */
export function ListCard({ article }: { article: Article }) {
  return (
    <article className="group card-lift grid gap-5 border border-line bg-card p-5 sm:grid-cols-[220px_1fr]">
      <Link
        href={`/article/${article.slug}`}
        className="relative block aspect-[16/10] overflow-hidden border border-line sm:aspect-[4/3]"
        aria-label={article.title}
        tabIndex={-1}
      >
        <CardImage article={article} sizes="(max-width: 640px) 100vw, 220px" />
      </Link>
      <div className="flex flex-col">
        {article.category && (
          <Link href={`/category/${article.category.slug}`} className="tag-cap hover:underline">
            {article.category.name}
          </Link>
        )}
        <h3 className="mt-2 font-display text-xl font-semibold leading-snug">
          <Link href={`/article/${article.slug}`}>
            <span className="u-marker-hover">{article.title}</span>
          </Link>
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-moss">
          {truncate(article.description, 170)}
        </p>
        <div className="mt-auto flex items-center justify-between pt-4">
          <Meta article={article} />
          <span
            aria-hidden="true"
            className="text-sm font-semibold text-pine transition-transform group-hover:translate-x-1"
          >
            →
          </span>
        </div>
      </div>
    </article>
  );
}
