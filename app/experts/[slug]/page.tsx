import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListCard } from "@/components/ArticleCard";
import BlocksRenderer from "@/components/BlocksRenderer";
import EmptyState from "@/components/EmptyState";
import { SITE_URL } from "@/lib/config";
import { pageMeta } from "@/lib/seo";
import { fetchArticlesByAuthor, fetchAuthorBySlug } from "@/lib/strapi";
import { blocksToPlainText, truncate } from "@/lib/utils";

export const revalidate = 600;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const author = await fetchAuthorBySlug(slug);
  if (!author) return { robots: { index: false } };
  const bio = truncate(blocksToPlainText(author.bio), 158);
  return pageMeta({
    title: `${author.name} — Expert Profile`,
    description: bio || `Articles and guides by ${author.name}.`,
    path: `/experts/${slug}`,
  });
}

export default async function ExpertPage({ params }: Props) {
  const { slug } = await params;
  const [author, articles] = await Promise.all([
    fetchAuthorBySlug(slug),
    fetchArticlesByAuthor(slug),
  ]);
  if (!author) notFound();

  const profileUrl = `${SITE_URL}/experts/${slug}`;
  const bioText = truncate(blocksToPlainText(author.bio), 200);
  const profileLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      "@id": `${profileUrl}#person`,
      name: author.name,
      url: profileUrl,
      ...(author.role ? { jobTitle: author.role } : {}),
      ...(bioText ? { description: bioText } : {}),
      ...(author.avatarUrl ? { image: author.avatarUrl } : {}),
      worksFor: { "@id": `${SITE_URL}/#organization` },
    },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profileLd) }}
      />
      <nav aria-label="Breadcrumb" className="text-xs text-moss">
        <Link href="/" className="hover:text-pine">
          Home
        </Link>
        <span aria-hidden="true" className="mx-1.5">
          /
        </span>
        <Link href="/experts" className="hover:text-pine">
          Experts
        </Link>
        <span aria-hidden="true" className="mx-1.5">
          /
        </span>
        <span>{author.name}</span>
      </nav>

      <header className="reveal rule-double mt-6 flex flex-col gap-6 pb-8 sm:flex-row sm:items-center">
        <span className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-parchment font-display text-4xl font-semibold text-pine">
          {author.avatarUrl ? (
            <Image
              src={author.avatarUrl}
              alt={author.name}
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : (
            author.name.charAt(0)
          )}
        </span>
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {author.name}
          </h1>
          {author.role && <p className="tag-cap mt-2">{author.role}</p>}
        </div>
      </header>

      {author.bio && author.bio.length > 0 && (
        <section aria-label="Biography" className="reveal reveal-2 mt-8 max-w-[760px]">
          <BlocksRenderer blocks={author.bio} />
        </section>
      )}

      <section aria-labelledby="author-articles" className="mt-14">
        <h2
          id="author-articles"
          className="rule-double pb-4 font-display text-2xl font-semibold tracking-tight"
        >
          Articles by {author.name}
        </h2>
        <div className="mt-8">
          {articles.length > 0 ? (
            <div className="space-y-6">
              {articles.map((article) => (
                <ListCard key={article.slug} article={article} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No published articles yet"
              note={`${author.name}'s first pieces are still in the works.`}
            />
          )}
        </div>
      </section>
    </div>
  );
}
