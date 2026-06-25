import Link from "next/link";

function pageHref(basePath: string, page: number): string {
  if (page <= 1) return basePath;
  return `${basePath}${basePath.includes("?") ? "&" : "?"}page=${page}`;
}

/** Window of page numbers around the current page, with edges always shown. */
function pageWindow(current: number, total: number): (number | "…")[] {
  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  const sorted = [...pages]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
}

export default function Pagination({
  basePath,
  page,
  pageCount,
}: {
  basePath: string;
  page: number;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;

  return (
    <nav aria-label="Pagination" className="rule-dotted mt-10 pt-6">
      <ul className="flex flex-wrap items-center justify-center gap-2">
        {page > 1 && (
          <li>
            <Link
              href={pageHref(basePath, page - 1)}
              className="flex h-10 items-center border border-line bg-card px-4 text-sm font-semibold transition-colors hover:border-pine hover:text-pine"
            >
              ← Prev
            </Link>
          </li>
        )}
        {pageWindow(page, pageCount).map((p, i) =>
          p === "…" ? (
            <li key={`gap-${i}`} className="px-1 text-moss">
              …
            </li>
          ) : (
            <li key={p}>
              <Link
                href={pageHref(basePath, p)}
                aria-current={p === page ? "page" : undefined}
                className={`flex h-10 w-10 items-center justify-center border text-sm font-semibold transition-colors ${
                  p === page
                    ? "border-pine bg-pine text-paper"
                    : "border-line bg-card hover:border-pine hover:text-pine"
                }`}
              >
                {p}
              </Link>
            </li>
          ),
        )}
        {page < pageCount && (
          <li>
            <Link
              href={pageHref(basePath, page + 1)}
              className="flex h-10 items-center border border-line bg-card px-4 text-sm font-semibold transition-colors hover:border-pine hover:text-pine"
            >
              Next →
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}
