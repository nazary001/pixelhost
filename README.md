# PixelHost

Web-hosting content site — plain-language guides, how-tos and reviews on web
hosting, domains, WordPress and website builders. Built with Next.js 16 (App
Router) + Tailwind CSS 4. Cloned from the MKLern content-site structure and
rebranded; the architecture (MongoDB-backed content, ISR, SEO scaffolding) is
unchanged.

The site is one of several clients sharing a single MongoDB Atlas database
(`gc`) and reads only its own collections (`post4s`, `category4s`, `author4s`,
`contact4s`). Content categories are defined in `lib/config.ts`, not in the
database.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Environment variables (see `.env.example`):

| Variable               | Scope        | Purpose                                  |
| ---------------------- | ------------ | ---------------------------------------- |
| `MONGODB_URI`          | server-only  | Atlas connection string (user `gcapp`)   |
| `MONGODB_DB`           | server-only  | Database name (`gc`)                     |
| `MEDIA_BASE_URL`       | build+server | Media bucket base URL (no trailing `/`)  |
| `NEXT_PUBLIC_SITE_URL` | build-time   | Canonical site URL (sitemap, RSS, OG)    |
| `NEXT_PUBLIC_GA_ID`    | build-time   | GA4 id, optional                         |

The connection string is used only on the server (`lib/content.ts` through
`lib/mongo.ts`, and `app/api/contact/route.ts`); it is never shipped to the
browser. The content scripts additionally need `S3_BUCKET`, `AWS_REGION`,
`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` (uploads), see below.

## Structure

- `app/` — routes: home, `category/[slug]`, `article/[slug]`, `experts`,
  `search`, `about`, `contact`, legal pages, `sitemap.ts`, `robots.ts`,
  `rss.xml`.
- `components/` — header/footer, article cards, rich-text blocks renderer, forms.
- `lib/` — site config (`config.ts`), data layer (`content.ts`, MongoDB access
  in `mongo.ts`), types, utils.
- `scripts/` — content generation (`gen4.mjs` → Gemini), seeding (`seed4.mjs`)
  and cover backfill (`backfill-images4.mjs`); helpers in `scripts/lib/`.
- `tests/` — `npm test` (node:test; needs `MONGODB_URI`, writes only to `gc_test`).

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
   | `MONGODB_URI` | the Atlas SRV connection string (mark as **Sensitive**) |
   | `MONGODB_DB` | `gc` |
   | `MEDIA_BASE_URL` | the media bucket base URL |
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

Notes: database queries are capped at 8s (`maxTimeMS`) to fit serverless
function limits; `.env*` is gitignored so the connection string never reaches
the repo.

## Content scripts

```bash
GEMINI_API_KEY=... node scripts/gen4.mjs                      # writes scripts/articles.json
node --env-file=.env.local scripts/seed4.mjs --dry-run        # plan only, no writes
node --env-file=.env.local scripts/seed4.mjs [articles.json]  # creates posts + uploads covers to S3
node --env-file=.env.local scripts/backfill-images4.mjs       # covers for posts without one (--dry-run supported)
```

New documents get Strapi-compatible envelopes (`id` from the `counters`
collection, 24-char `documentId`, `publishedAt`), cover images go to
`uploads/<name>_<hash>.<ext>` in the bucket with Strapi-style size variants,
and a matching `files` record is written.

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
