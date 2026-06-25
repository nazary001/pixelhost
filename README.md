# PixelHost

Web-hosting content site — plain-language guides, how-tos and reviews on web
hosting, domains, WordPress and website builders. Built with Next.js 16 (App
Router) + Tailwind CSS 4. Cloned from the MKLern content-site structure and
rebranded; the architecture (Strapi-backed content, ISR, SEO scaffolding) is
unchanged.

The site is one of several clients sharing a single Strapi instance and reads
only its own collections (`post4s`, `author4s`, `contact4s`). Content
categories are defined in `lib/config.ts`, not in Strapi.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Environment variables (see `.env.example`):

| Variable               | Scope        | Purpose                                  |
| ---------------------- | ------------ | ---------------------------------------- |
| `STRAPI_API_URL`       | server-only  | Base URL of the shared Strapi instance   |
| `STRAPI_TOKEN`         | server-only  | API token (read + create)                |
| `NEXT_PUBLIC_SITE_URL` | build-time   | Canonical site URL (sitemap, RSS, OG)    |
| `NEXT_PUBLIC_GA_ID`    | build-time   | GA4 id, optional                         |

The Strapi token is used only on the server (`lib/strapi.ts` and
`app/api/contact/route.ts`); it is never shipped to the browser.

## Structure

- `app/` — routes: home, `category/[slug]`, `article/[slug]`, `experts`,
  `search`, `about`, `contact`, legal pages, `sitemap.ts`, `robots.ts`,
  `rss.xml`.
- `components/` — header/footer, article cards, Strapi blocks renderer, forms.
- `lib/` — site config (`config.ts`), Strapi API layer (`strapi.ts`), types,
  utils.

Content categories live in `lib/config.ts`: `web-hosting`, `wordpress`,
`domains`, `website-builders`, `reviews`.

## Deploy to Vercel

1. Push this repo to GitHub, then in Vercel: **Add New → Project → Import**
   the repo. Framework preset: Next.js — defaults are fine, no `vercel.json`
   needed.
2. Set the environment variables in **Project → Settings → Environment
   Variables** (all for Production, and optionally Preview):

   | Variable | Value |
   | --- | --- |
   | `STRAPI_API_URL` | the shared Strapi instance URL |
   | `STRAPI_TOKEN` | the API token (mark as **Sensitive**) |
   | `NEXT_PUBLIC_SITE_URL` | the production URL (e.g. `https://pixelhost.io`) |
   | `NEXT_PUBLIC_GA_ID` | GA4 id, optional |
   | `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | from Search Console, optional |

   `NEXT_PUBLIC_*` values are inlined at build time — changing them
   requires a redeploy.
3. Deploy. ISR (`revalidate`) works natively on Vercel; articles refresh
   every 5 minutes, sitemap/RSS hourly, no extra config.
4. Attach the custom domain in **Settings → Domains**, set
   `NEXT_PUBLIC_SITE_URL` to it and redeploy so canonicals/sitemap/JSON-LD
   use the real domain.

Notes: Strapi fetch timeouts are capped at 8s to fit serverless function
limits; `.env*` is gitignored so the token never reaches the repo.

## SEO

Built in: canonicals on every page (incl. paginated categories), per-page
titles/descriptions, OpenGraph/Twitter cards with a generated fallback image
(`/opengraph-image`), JSON-LD (Organization + logo, WebSite + SearchAction,
Article, BreadcrumbList, FAQPage), `/sitemap.xml` (auto-refreshed hourly,
includes lastModified), `/robots.txt`, `/rss.xml` with autodiscovery,
`/manifest.webmanifest`, `/logo.png`.

To connect Search Console after deploying to the real domain, set
`NEXT_PUBLIC_SITE_URL` to the production URL, add a **URL prefix** property in
[Search Console](https://search.google.com/search-console), verify via the
**HTML tag** method (copy the `content` value into
`NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`) or DNS, then submit `sitemap.xml`.
