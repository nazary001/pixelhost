# DEPLOY-MONGO — pixelhost.io (`pixelhost-content`): Strapi Cloud → MongoDB Atlas + S3

Branch `mongo-migration` (git worktree `C:\Users\nazar\OneDrive\Desktop\GC-coding\pixelhost-content-mongo`,
based on `origin/main` 1014218). Remote `https://github.com/nazary001/pixelhost.git`, Vercel prod = `main`.
The sibling checkout `pixelhost-next` is a stale static rebuild with no CMS usage (see its `DEPLOY-MONGO.md`).

## What changed (code)

| Area | Before | After |
|---|---|---|
| `lib/strapi.ts` → `lib/content.ts` | REST calls to `post4s` / `author4s` / `contact4s` with `STRAPI_TOKEN` | Same exported functions and return shapes, MongoDB driver via `lib/mongo.ts` (template copy, unchanged). Published-only filter `publishedAt: {$ne: null}`, sort `publishedAt:-1, id:-1`, relations (`{id, documentId}` refs) populated with a second query on `documentId` (published targets only), pagination = `countDocuments` + `skip/limit`, `pageCount = ceil(total/pageSize)`, search = escaped case-insensitive regex on title/description, every query capped at 8 s (`maxTimeMS`). Any DB error → empty result + `console.error("[content] …")` (the old "null on CMS failure" contract). |
| `app/api/contact/route.ts` | `POST /api/contact4s` | `insertOne` into `contact4s` with the Strapi envelope (`id` from `counters`, 24-char `documentId`, `createdAt/updatedAt/publishedAt`). Validation/honeypot unchanged. |
| `next.config.ts` | `remotePatterns` for `*.strapiapp.com` | host of `MEDIA_BASE_URL` only (warns at build time if unset). |
| `scripts/seed4.mjs`, `scripts/backfill-images4.mjs` | REST + `POST /api/upload` | driver writes (`newDoc` → `nextId`/`newDocumentId`/`publishedAt`), inverse `posts` arrays kept in step, covers uploaded to S3 by `scripts/lib/media.mjs` (original + Strapi-style `large/medium/small/thumbnail` via sharp, `files` record with the Strapi field set, `source: "vivid"`), `--dry-run` flag. Includes the uncommitted `isRaster`/SVG guard from the main working tree. |
| `scripts/seed.mjs`, `enrich.mjs`, `fill-missing-images.mjs`, `fix-missing-image.mjs`, `author-avatars.mjs` | dead MKLearn-era Strapi scripts (`mklern-*` collections that do not exist) | deleted |
| deps | — | `mongodb ^6.21` (runtime); `@aws-sdk/client-s3`, `sharp` (dev, scripts only) |
| tests | none | `npm test` → node:test, 12 tests (`tests/content.test.mts` against `gc_test`, `tests/media.test.mts` with mocked S3) |
| docs | README / SEO-CHECKLIST mention Strapi | updated |

No `STRAPI_*`, `strapiapp.com` or `/api/upload` left in code. Routes, HTML, JSON shapes, ISR `revalidate` values and public URLs are unchanged.

## Environment variables

**Vercel → project *pixelhost* → Settings → Environment Variables** (Production **and** Preview):

| Variable | Value | Notes |
|---|---|---|
| `MONGODB_URI` | the SRV string (`MONGODB_URI_SRV` in `C:\gc-migration\atlas.env`, user `gcapp`) | mark **Sensitive** |
| `MONGODB_DB` | `gc` | |
| `MEDIA_BASE_URL` | `https://globecoders-media-prod.s3.eu-central-1.amazonaws.com` | no trailing slash; read at **build time** by `next.config.ts` → changing it needs a redeploy |
| `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_ADSENSE_CLIENT`, `NEXT_PUBLIC_*_VERIFICATION` | unchanged | |
| `STRAPI_API_URL`, `STRAPI_TOKEN` | **remove after the rollback window** | unused by the new code; the previous deployment still needs them for an Instant Rollback |

Optional: `MONGODB_POOL` (default 10), `MONGODB_APP_NAME`.

**Atlas → Network Access**: Vercel functions have dynamic egress IPs → the cluster must allow `0.0.0.0/0` (or a Vercel Secure Compute range). Not verified from here.

**Local** (`.env.local`, gitignored; `.env.example` lists the keys): `MONGODB_URI` in the **host-list** form (this Windows box cannot resolve SRV — note in `atlas.env`), `MONGODB_DB`, `MEDIA_BASE_URL`; for the scripts additionally `S3_BUCKET=globecoders-media-prod`, `AWS_REGION=eu-central-1`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (IAM user with `s3:PutObject` on `uploads/*`).

## Build / deploy / rollback

- Deploy = merge (or fast-forward) `mongo-migration` into `main` and push; Vercel auto-builds with the stock `next build` (no build-command or `vercel.json` changes, Node ≥ 20). Set the env vars **before** pushing.
- Local: `npm ci && npm run build && npm start` (port 3000); `npm test`; `npm run lint`.
- Rollback: Vercel → Deployments → previous (Strapi) deployment → **Instant Rollback**. Strapi Cloud keeps running until the whole migration is closed, so the old build keeps working as long as `STRAPI_*` are still set.
- Contact submissions made on the Mongo build during a rollback window stay in Atlas only (Strapi never sees them).

## Hot collections (delta-sync right before the switch)

| Collection | Why | Size at dump |
|---|---|---|
| `contact4s` | written by the live site on every contact-form submit | 2 rows (last 2026-09-23) |
| `post4s`, `category4s`, `author4s` | change only when the owner runs `scripts/seed4.mjs` / `backfill-images4.mjs` or edits in the Strapi admin | 228 / 5 / 3 (last post 2026-09-27) |
| `files` (source `vivid`) | only via the same uploads | — |

Nothing else is read or written by this site. After the switch, `counters.post4s` (558), `category4s` (10), `author4s` (6), `contact4s` (2) are already seeded; `counters.files` is created lazily by the uploader (`$max` of existing `files.id` where `source = "vivid"`).

## Known drift to reconcile

- `pixelhost-content` main working tree has **uncommitted** edits: `scripts/backfill-images4.mjs` (isRaster/SVG guard — already folded into the migrated script) and `scripts/used-images.json` (+22 URLs — **not** in this branch; copy that file over before the next seed run so no cover repeats).
- Nothing runs on a server: Vercel builds from GitHub `main`. `pixelhost-next` local `main` (d35efa7) is stale; its `origin/main` is the same 1014218.
- **S3 is still empty** (media copy is a separate task): every article image 404s until `uploads/*` are copied. Pages render; `<img>`/OG image URLs point at the bucket already.
- `lib/mongo.ts` is the shared template verbatim → eslint prints one *warning* (unused `eslint-disable no-var`). Leave it.
- Strapi stamped `publishedAt` on the non-Draft&Publish `contact4s` too; the migrated rows have it, so new submissions set it as well (`CONVENTIONS.md` §2 lists `publishedAt` only for D&P types).

## Smoke checklist

Done locally on 2026-10-07 against Atlas (`gc` read-only, writes only to `gc_test`, cleaned up):

1. `npx tsc --noEmit` → clean; `npx eslint .` → 0 errors (1 template warning).
2. `node --env-file=.env.local --test --disable-warning=ExperimentalWarning --import ./tests/register.mjs "tests/**/*.test.mts"` → 12/12 pass.
3. `npx next build` → OK (16 prerendered routes incl. `/`, `/experts`, `/sitemap.xml`, `/rss.xml`).
4. `npx next start -p 3077` (`MONGODB_DB=gc`): `/` 200 · `/article/what-is-web-hosting` 200 (title, OG image = S3 URL) · `/category/web-hosting` 200, `?page=2` 200, `?page=99` 404 · `/category/reviews` 200 · `/experts` 200 (3 authors) · `/experts/alex-mercer` 200 · `/experts/nobody` 404 · `/search?q=hosting` 200, `?q=c%2B%2B` 200 · `/sitemap.xml` 200 (243 `<loc>`) · `/rss.xml` 200 (50 items) · `/article/does-not-exist` 404 · `GET /api/contact` 405 · zero `strapiapp` in HTML · `/_next/image` with the S3 host → 404 from upstream (bucket empty, expected), foreign host → 400.
5. `MONGODB_DB=gc_test npx next start -p 3471`: `POST /api/contact` valid ×2 → `{ok:true}` and rows `id 1, 2`, 24-char `documentId`, `createdAt = updatedAt = publishedAt`; invalid email → 400; honeypot → `{ok:true}` and **no** row; bad JSON → 400. Rows and the `gc_test` counter removed afterwards.
6. `MONGODB_DB=gc node --env-file=.env.local scripts/seed4.mjs --dry-run` → 10/10 "already exists, skipping", 0 writes; `scripts/backfill-images4.mjs --dry-run` → "228 articles, 0 missing covers".

Repeat on the Vercel **preview** deployment after setting the env vars, then after promoting: open `/`, an article, a category page, `/experts`, submit the contact form (check `gc.contact4s` in Atlas), and watch the function logs for `[content]` errors.

## Not verified here

- Live S3 upload (no AWS keys on this machine): covered by the mocked-S3 unit tests and `--dry-run` only. First real run: `node --env-file=.env.local scripts/backfill-images4.mjs` against one missing cover, then check the object and the `files` row.
- Vercel ↔ Atlas connectivity (IP allowlist, SRV resolution) — only local connections were tested.
- Production ISR timing (unchanged page-level `revalidate`; the per-fetch `next: { revalidate }` hints disappeared with `fetch`, which changes nothing because the page-level values were the same).
