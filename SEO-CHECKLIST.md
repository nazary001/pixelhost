# PixelHost — SEO, Search Console & AdSense checklist

Site: **https://pixelhost.io** · GA4: **G-V97S306XZZ** · AdSense: **ca-pub-1441213592088493**

Everything in section 1 is already implemented in code. Sections 2–4 are the
manual steps that can only be done inside your Google accounts and Vercel.

---

## 1. Already wired in the code ✅

- **Metadata**: per-page `<title>`, meta description, canonical URL, OpenGraph
  + Twitter cards on every route (home, article, category, experts, static).
- **Structured data (JSON-LD)**:
  - `Organization` + `WebSite` (with Sitelinks `SearchAction`) — site-wide.
  - `Article` per post — headline, dates, author `Person`, publisher,
    `articleSection`, `keywords`, `wordCount`, `image` (`ImageObject`),
    `inLanguage`, `isAccessibleForFree`.
  - `BreadcrumbList` on article and category pages.
  - `FAQPage` auto-extracted from the in-article FAQ section.
  - `CollectionPage` + `ItemList` on category and experts pages.
  - `ProfilePage` + `Person` on author pages.
- **Crawl & discovery**: `robots.txt` (`/robots.ts`), XML `sitemap.xml`
  (`/sitemap.ts`, includes article images), RSS feed (`/rss.xml`).
- **Verification hooks**: `google-adsense-account` meta + AdSense loader
  (`components/AdSense.tsx`) + `/ads.txt`; Search Console / Bing / Yandex meta
  tags driven by env vars.
- **Performance / technical**: AVIF/WebP images, security headers, `compress`,
  legacy-URL 301 redirects, Consent Mode v2 (GDPR-ready).

---

## 2. Google Search Console (do once per property)

1. Open https://search.google.com/search-console and **Add property**.
   - Easiest: **URL-prefix** property `https://pixelhost.io`.
2. **Verify ownership** — pick ONE:
   - **Google Analytics (recommended, zero code):** GA4 `G-V97S306XZZ` is already
     live on the site. If you verify with the same Google account that owns that
     GA property, GSC verifies instantly — nothing to paste.
   - **HTML tag:** copy the `content="…"` value Google shows, set it as
     `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` in Vercel (see §4), redeploy.
   - **DNS:** add the TXT record Google gives you at your registrar / Vercel DNS.
3. **Submit the sitemap:** Sitemaps → add `sitemap.xml` → Submit.
4. **Request indexing** for the homepage and a few top articles (URL Inspection).
5. Validate rich results: https://search.google.com/test/rich-results — paste a
   live article URL; confirm Article + Breadcrumb (+ FAQ) are detected.

---

## 3. Google AdSense

1. ads.txt is already served at https://pixelhost.io/ads.txt with
   `pub-1441213592088493` — confirm it matches the publisher id of the AdSense
   account you'll apply with. **If the account differs, update both `ads.txt`
   and `NEXT_PUBLIC_ADSENSE_CLIENT`.**
2. In AdSense → **Sites → Add site** `pixelhost.io`. The verification snippet is
   already injected (loader script + `google-adsense-account` meta), so it
   should verify without extra code once `NEXT_PUBLIC_ADSENSE_CLIENT` is set on
   Vercel and the site is deployed.
3. Make sure enough **original, indexed content** is published before applying —
   AdSense rejects thin sites. The privacy policy, terms, about and contact
   pages required for approval are already in place; the privacy policy now
   discloses third-party/Google advertising cookies and opt-out links.
4. After approval, turn on **Auto ads** in the AdSense dashboard — the loader is
   already on every page, so ads appear with no further code change.
5. **EEA/UK note:** to serve ads to European visitors, Google now requires a
   Google-certified CMP. The site ships Consent Mode v2 (consent defaults to
   denied), but the cookie banner is custom. For full EEA monetisation, enable
   Google's **Funding Choices / Privacy & messaging** CMP in AdSense, or swap in
   a certified CMP.

---

## 4. Vercel environment variables

Set these on the project (Production) and redeploy:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_ADSENSE_CLIENT` | `ca-pub-1441213592088493` |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | *(only if you use the HTML-tag GSC method)* |
| `NEXT_PUBLIC_BING_VERIFICATION` | *(optional — Bing Webmaster Tools)* |
| `NEXT_PUBLIC_YANDEX_VERIFICATION` | *(optional)* |

> `NEXT_PUBLIC_GA_ID`, `STRAPI_API_URL` and `STRAPI_TOKEN` are already set.

---

## 5. Post-deploy validation URLs

- https://pixelhost.io/robots.txt
- https://pixelhost.io/sitemap.xml
- https://pixelhost.io/rss.xml
- https://pixelhost.io/ads.txt
- View-source any article → confirm `application/ld+json` blocks and the
  `google-adsense-account` meta tag.
