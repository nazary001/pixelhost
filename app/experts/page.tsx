import Image from "next/image";
import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { pageMeta } from "@/lib/seo";
import { fetchAuthors } from "@/lib/strapi";
import { blocksToPlainText, truncate } from "@/lib/utils";

export const revalidate = 600;

export const metadata = pageMeta({
  title: "Our Experts",
  description: `Meet the writers, reviewers and editors behind ${SITE_NAME} — the people who research, test and fact-check every guide we publish.`,
  path: "/experts",
});

export default async function ExpertsPage() {
  const authors = await fetchAuthors();

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Our Experts — ${SITE_NAME}`,
    url: `${SITE_URL}/experts`,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    ...(authors.length > 0
      ? {
          mainEntity: {
            "@type": "ItemList",
            itemListElement: authors.map((a, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `${SITE_URL}/experts/${a.slug}`,
              name: a.name,
            })),
          },
        }
      : {}),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />
      <header className="reveal rule-double pb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Our <span className="u-marker">Experts</span>
        </h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-moss">
          Every guide on {SITE_NAME} is researched and written by a real person.
          Here&apos;s the team reading the fine print, testing the platforms and
          translating the jargon.
        </p>
      </header>

      <div className="reveal reveal-2 mt-10">
        {authors.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {authors.map((author) => {
              const bio = truncate(blocksToPlainText(author.bio), 140);
              return (
                <Link
                  key={author.slug}
                  href={`/experts/${author.slug}`}
                  className="card-lift group flex items-start gap-4 border border-line bg-card p-6"
                >
                  <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-parchment font-display text-2xl font-semibold text-pine">
                    {author.avatarUrl ? (
                      <Image
                        src={author.avatarUrl}
                        alt={author.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      author.name.charAt(0)
                    )}
                  </span>
                  <span>
                    <span className="block font-display text-lg font-semibold">
                      <span className="u-marker-hover">{author.name}</span>
                    </span>
                    {author.role && (
                      <span className="tag-cap mt-0.5 block">{author.role}</span>
                    )}
                    {bio && (
                      <span className="mt-2 block text-sm leading-relaxed text-moss">
                        {bio}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="The team page is being assembled"
            note="Author profiles will appear here once the first guides are published."
          />
        )}
      </div>
    </div>
  );
}
