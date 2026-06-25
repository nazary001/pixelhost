import Link from "next/link";

export default function SectionHeading({
  title,
  href,
  hrefLabel = "View all",
}: {
  /** Kept for call-site compatibility; the clean theme doesn't display it. */
  index?: string;
  title: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-8 flex items-center gap-4">
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
      <h2 className="text-center text-xl font-bold tracking-tight text-ink sm:text-2xl">
        {title}
      </h2>
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
      {href && (
        <Link
          href={href}
          className="group hidden shrink-0 text-sm font-semibold text-pine hover:text-pine-deep sm:block"
        >
          {hrefLabel}{" "}
          <span
            aria-hidden="true"
            className="inline-block transition-transform group-hover:translate-x-1"
          >
            →
          </span>
        </Link>
      )}
    </div>
  );
}
