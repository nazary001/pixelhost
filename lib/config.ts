export const SITE_NAME = "PixelHost";
export const SITE_TAGLINE = "Hosting, domains and building your site — made simple.";
export const SITE_DESCRIPTION =
  "PixelHost publishes plain-language guides, reviews and how-tos on web hosting, domains, WordPress and building your website — so you can get online faster and keep your site fast and secure.";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://pixelhost.io"
).replace(/\/+$/, "");

export interface CategoryDef {
  slug: string;
  name: string;
  blurb: string;
}

export const CATEGORIES: CategoryDef[] = [
  {
    slug: "web-hosting",
    name: "Web Hosting",
    blurb:
      "How hosting works and how to choose it — shared, VPS, cloud and dedicated, explained without the jargon.",
  },
  {
    slug: "wordpress",
    name: "WordPress",
    blurb:
      "Hosting, speed, security and plugins for WordPress — keep your site fast, safe and easy to run.",
  },
  {
    slug: "domains",
    name: "Domains",
    blurb:
      "Registering, pointing and transferring domains, plus DNS and email basics, made painless.",
  },
  {
    slug: "website-builders",
    name: "Website Builders",
    blurb:
      "Builders, CMS platforms and the fastest ways to get a real website online — compared honestly.",
  },
  {
    slug: "reviews",
    name: "Reviews",
    blurb:
      "Hands-on looks at hosting providers, builders and tools, with the fine print and pricing read for you.",
  },
];

export function getCategory(slug: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function categoryIndex(slug: string): string {
  const i = CATEGORIES.findIndex((c) => c.slug === slug);
  return String(i + 1).padStart(2, "0");
}
