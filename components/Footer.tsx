import Link from "next/link";
import { CATEGORIES, SITE_DESCRIPTION, SITE_NAME } from "@/lib/config";

const COMPANY_LINKS = [
  { href: "/about", label: "About Us" },
  { href: "/experts", label: "Our Experts" },
  { href: "/contact", label: "Contact" },
];

const LEGAL_LINKS = [
  { href: "/terms-of-use", label: "Terms of Use" },
  { href: "/privacy-policy", label: "Privacy Policy" },
];

export default function Footer() {
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <p className="text-2xl font-bold tracking-tight">
            Pixel<span className="text-marker">Host</span>
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/65">
            {SITE_DESCRIPTION}
          </p>
        </div>

        <nav aria-label="Sections">
          <p className="tag-cap !text-marker">Sections</p>
          <ul className="mt-4 space-y-2.5">
            {CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/category/${c.slug}`}
                  className="text-sm text-white/75 transition-colors hover:text-marker"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Company">
          <p className="tag-cap !text-marker">Company</p>
          <ul className="mt-4 space-y-2.5">
            {COMPANY_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-white/75 transition-colors hover:text-marker"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Legal">
          <p className="tag-cap !text-marker">Legal</p>
          <ul className="mt-4 space-y-2.5">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-white/75 transition-colors hover:text-marker"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </p>
          <p>
            Independent editorial project. Always verify current plans and
            pricing with the provider.
          </p>
        </div>
      </div>
    </footer>
  );
}
