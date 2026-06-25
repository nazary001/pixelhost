import Link from "next/link";
import { CATEGORIES } from "@/lib/config";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
      <p className="chapter-num !text-[6rem]">404</p>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">
        This page skipped <span className="u-marker">class</span>
      </h1>
      <p className="mx-auto mt-4 max-w-md leading-relaxed text-moss">
        The address may be mistyped, or the article was moved. Head back to the
        homepage or browse one of the sections.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="btn-pine">
          Back to homepage
        </Link>
      </div>
      <ul className="mt-10 flex flex-wrap justify-center gap-3">
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
    </div>
  );
}
