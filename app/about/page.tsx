import Link from "next/link";
import { CATEGORIES, SITE_NAME } from "@/lib/config";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "About Us",
  description: `What ${SITE_NAME} is, how we research our guides, and the editorial principles we follow.`,
  path: "/about",
});

const PRINCIPLES = [
  {
    title: "Plain language first",
    text: "If a sentence needs a sysadmin to parse, we rewrite it. Every guide is written to be understood on the first read.",
  },
  {
    title: "We read the fine print",
    text: "Renewal rates, uptime claims, bandwidth limits, refund windows — we go through the boring policy pages so our readers don't have to.",
  },
  {
    title: "No pay-to-play rankings",
    text: "Nobody can buy a better verdict in our reviews. When a page contains partner links, we say so on that page.",
  },
  {
    title: "Updated, not abandoned",
    text: "Hosts change pricing and plans get rebranded. We revisit published guides and stamp them with the latest review date.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="reveal rule-double pb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          About <span className="u-marker">{SITE_NAME}</span>
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-moss">
          We&apos;re an independent editorial project for people getting a
          website online — and for everyone trying to figure out which host,
          domain or builder is actually worth paying for.
        </p>
      </header>

      <section className="reveal reveal-2 mt-10 space-y-5 leading-relaxed">
        <p>
          Getting online got complicated. There are more hosting plans, domain
          registrars and website builders than anyone can compare, and the
          details — shared vs. VPS vs. cloud, DNS records, renewal pricing,
          uptime promises — come wrapped in jargon that seems designed to be
          skimmed and regretted later.
        </p>
        <p>
          {SITE_NAME} exists to shrink that complexity. We write short,
          structured explainers that answer one question well, step-by-step
          how-tos for hosting, domains and WordPress, and reviews that judge
          providers by what they actually deliver rather than their landing
          pages.
        </p>
      </section>

      <section aria-labelledby="sections-heading" className="reveal reveal-3 mt-12">
        <h2
          id="sections-heading"
          className="rule-double pb-3 font-display text-2xl font-semibold"
        >
          What we publish
        </h2>
        <ul className="mt-6 space-y-4">
          {CATEGORIES.map((c, i) => (
            <li key={c.slug} className="flex gap-4">
              <span className="font-display text-lg font-semibold text-pine">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p>
                <Link
                  href={`/category/${c.slug}`}
                  className="font-semibold text-pine hover:underline"
                >
                  {c.name}
                </Link>{" "}
                <span className="text-moss">— {c.blurb}</span>
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="principles-heading" className="reveal reveal-4 mt-12">
        <h2
          id="principles-heading"
          className="rule-double pb-3 font-display text-2xl font-semibold"
        >
          How we work
        </h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="border border-line bg-card p-5">
              <h3 className="font-display text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-moss">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="rule-dotted mt-12 pt-6 text-sm leading-relaxed text-moss">
        Want to know who writes the guides? Meet{" "}
        <Link href="/experts" className="text-pine underline">
          our experts
        </Link>
        , or{" "}
        <Link href="/contact" className="text-pine underline">
          send the desk a message
        </Link>
        .
      </p>
    </div>
  );
}
