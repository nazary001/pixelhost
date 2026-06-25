/**
 * Seeds the mklern-* Strapi collections with categories, authors and the
 * articles from scripts/articles.json (written by the article workflow).
 * Cover images are CC0 photos found via the Openverse API (no attribution
 * required, commercial use allowed).
 *
 * Run:  node --env-file=.env.local scripts/seed.mjs
 * Needs STRAPI_API_URL + STRAPI_TOKEN with create permissions on
 * mklern-article / mklern-author / mklern-category and the Upload plugin.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Usage: node --env-file=.env.local scripts/seed.mjs [articles-file.json]
const ARTICLES_FILE = process.argv[2] ?? "articles.json";
const USED_IMAGES_PATH = resolve(import.meta.dirname, "used-images.json");

function loadUsedImages() {
  try {
    return new Set(JSON.parse(readFileSync(USED_IMAGES_PATH, "utf8")));
  } catch {
    return new Set();
  }
}

const usedImages = loadUsedImages();

const STRAPI_URL = (process.env.STRAPI_API_URL ?? "").replace(/\/+$/, "");
const STRAPI_TOKEN = process.env.STRAPI_TOKEN ?? "";

if (!STRAPI_URL || !STRAPI_TOKEN) {
  console.error("STRAPI_API_URL / STRAPI_TOKEN are not set.");
  process.exit(1);
}

const AUTH = { Authorization: `Bearer ${STRAPI_TOKEN}` };

const CATEGORIES = [
  { name: "What Is", slug: "what-is", description: "Core concepts decoded — finance, credit and education terms explained without the jargon." },
  { name: "Online Courses", slug: "online-courses", description: "Honest breakdowns of certificates, bootcamps and university programs you can take from anywhere." },
  { name: "Student Loans", slug: "student-loans", description: "Borrowing for an education — and paying it back — explained step by step." },
  { name: "Reviews", slug: "reviews", description: "Hands-on looks at lenders, platforms and financial products, with the fine print read for you." },
];

const p = (text) => ({ type: "paragraph", children: [{ type: "text", text }] });

const AUTHORS = [
  {
    name: "Daniel Hayes",
    slug: "daniel-hayes",
    role: "Education Finance Writer",
    bio: [p("Daniel writes about paying for education — student loans, repayment strategy and the paperwork in between. He has spent a decade translating lending fine print into plain English.")],
  },
  {
    name: "Priya Raman",
    slug: "priya-raman",
    role: "Online Learning Analyst",
    bio: [p("Priya researches online course platforms, university certificates and bootcamps. She has completed more online programs than she will publicly admit and reviews them with a spreadsheet open.")],
  },
  {
    name: "Marcus Webb",
    slug: "marcus-webb",
    role: "Consumer Credit Researcher",
    bio: [p("Marcus covers consumer credit, benefits and household finance. His focus is the questions people are too embarrassed to ask their bank.")],
  },
];

const IMAGE_QUERIES = {
  "what-is-a-payday-loan": "cash money wallet bills",
  "what-is-credit-utilization": "credit card payment laptop",
  "government-benefits-guide": "application form paperwork desk",
  "university-of-washington-digital-marketing-certificate": "university campus students",
  "hbs-online-digital-marketing": "laptop online learning desk",
  "best-finance-courses-udemy-coursera": "finance charts laptop desk",
  "student-loan-grace-periods": "graduation cap diploma",
  "federal-student-loan-limits": "student calculator studying",
  "student-loan-consolidation-guide": "documents pen signing office",
  "coursera-plus-review": "laptop coffee notebook study",
};

async function api(path, init = {}) {
  const res = await fetch(`${STRAPI_URL}/api/${path}`, {
    ...init,
    headers: { ...AUTH, ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = body?.error ? JSON.stringify(body.error) : res.statusText;
    throw new Error(`${init.method ?? "GET"} /${path} -> ${res.status}: ${detail}`);
  }
  return body;
}

async function ensureEntry(collection, slug, payload) {
  const found = await api(`${collection}?filters[slug][$eq]=${encodeURIComponent(slug)}`);
  if (Array.isArray(found.data) && found.data.length > 0) {
    console.log(`  = ${collection}/${slug} already exists`);
    return found.data[0].documentId;
  }
  const created = await api(collection, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: payload }),
  });
  console.log(`  + created ${collection}/${slug}`);
  return created.data.documentId;
}

async function findCc0Image(query) {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&license=cc0&page_size=20`;
  const res = await fetch(url, { headers: { "User-Agent": "MKLernSeeder/1.0" } });
  if (!res.ok) throw new Error(`Openverse search failed: ${res.status}`);
  const body = await res.json();
  const results = Array.isArray(body.results) ? body.results : [];
  const ranked = [
    ...results.filter((r) => (r.width ?? 0) >= 1200),
    ...results.filter((r) => (r.width ?? 0) >= 900 && (r.width ?? 0) < 1200),
    ...results.filter((r) => (r.width ?? 0) < 900),
  ];
  return ranked;
}

async function downloadImage(candidates) {
  // Never reuse a photo that an earlier article already took.
  const fresh = candidates.filter((c) => !usedImages.has(c.url));
  for (const candidate of fresh.slice(0, 8)) {
    try {
      const res = await fetch(candidate.url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MKLernSeeder/1.0)" },
        redirect: "follow",
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) continue;
      const contentType = res.headers.get("content-type") ?? "image/jpeg";
      if (!contentType.startsWith("image/")) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 30_000) continue; // skip tiny thumbnails
      usedImages.add(candidate.url);
      writeFileSync(USED_IMAGES_PATH, JSON.stringify([...usedImages], null, 2));
      return { buf, contentType: contentType.split(";")[0] };
    } catch {
      // try the next candidate
    }
  }
  return null;
}

async function uploadImage(buf, contentType, filename) {
  const form = new FormData();
  form.append("files", new Blob([buf], { type: contentType }), filename);
  const res = await fetch(`${STRAPI_URL}/api/upload`, {
    method: "POST",
    headers: AUTH,
    body: form,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = body?.error ? JSON.stringify(body.error) : res.statusText;
    throw new Error(`upload -> ${res.status}: ${detail}`);
  }
  return body[0].id;
}

function sectionsToBlocks(sections) {
  const blocks = [];
  for (const section of sections) {
    if (section.type === "h2" && section.text) {
      blocks.push({ type: "heading", level: 2, children: [{ type: "text", text: section.text }] });
    } else if (section.type === "p" && section.text) {
      blocks.push(p(section.text));
    } else if (section.type === "ul" && Array.isArray(section.items)) {
      blocks.push({
        type: "list",
        format: "unordered",
        children: section.items.map((item) => ({
          type: "list-item",
          children: [{ type: "text", text: item }],
        })),
      });
    }
  }
  return blocks;
}

async function createArticle(entry, categoryIds, authorIds, authorIndex) {
  const { article, category } = entry;
  const existing = await api(`mklern-articles?filters[slug][$eq]=${encodeURIComponent(article.slug)}`);
  if (Array.isArray(existing.data) && existing.data.length > 0) {
    console.log(`  = article "${article.slug}" already exists, skipping`);
    return "skipped";
  }

  const query =
    entry.imageQuery ?? IMAGE_QUERIES[article.slug] ?? article.tags.slice(0, 3).join(" ");
  let imageId = null;
  try {
    const candidates = await findCc0Image(query);
    const image = await downloadImage(candidates);
    if (image) {
      const ext = image.contentType.includes("png") ? "png" : "jpg";
      imageId = await uploadImage(image.buf, image.contentType, `${article.slug}-cover.${ext}`);
      console.log(`  ↑ image uploaded for "${article.slug}" (id ${imageId})`);
    } else {
      console.warn(`  ! no usable CC0 image found for "${article.slug}" (query: ${query})`);
    }
  } catch (err) {
    console.warn(`  ! image step failed for "${article.slug}": ${err.message}`);
  }

  const payload = {
    data: {
      title: article.title,
      slug: article.slug,
      description: article.description,
      content: sectionsToBlocks(article.sections),
      ...(imageId ? { featuredImage: imageId } : {}),
      views: Math.floor(Math.random() * 160) + 25,
      commentsCount: 0,
      tags: article.tags,
      isExclusive: false,
      category: categoryIds[category],
      author: authorIds[AUTHORS[authorIndex % AUTHORS.length].slug],
    },
  };

  try {
    await api("mklern-articles?status=published", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log(`  ✓ published "${article.title}"`);
    return "published";
  } catch (err) {
    console.warn(`  ! publish-on-create failed (${err.message}); creating as draft+publish...`);
    const created = await api("mklern-articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const documentId = created.data.documentId;
    await api(`mklern-articles/${documentId}?status=published`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log(`  ✓ published "${article.title}" (two-step)`);
    return "published";
  }
}

async function main() {
  const articles = JSON.parse(
    readFileSync(resolve(import.meta.dirname, ARTICLES_FILE), "utf8"),
  );
  console.log(`Seeding ${articles.length} articles from ${ARTICLES_FILE} to ${STRAPI_URL}\n`);

  console.log("Categories:");
  const categoryIds = {};
  for (const c of CATEGORIES) {
    categoryIds[c.slug] = await ensureEntry("mklern-categories", c.slug, c);
  }

  console.log("Authors:");
  const authorIds = {};
  for (const a of AUTHORS) {
    authorIds[a.slug] = await ensureEntry("mklern-authors", a.slug, a);
  }

  console.log("Articles:");
  let published = 0;
  let skipped = 0;
  const failed = [];
  for (let i = 0; i < articles.length; i++) {
    const entry = articles[i];
    try {
      const result = await createArticle(entry, categoryIds, authorIds, i);
      if (result === "published") published++;
      else skipped++;
    } catch (err) {
      console.error(`  ✗ "${entry.article?.slug}": ${err.message}`);
      failed.push(entry.article?.slug);
    }
  }

  console.log(`\nDone: ${published} published, ${skipped} skipped, ${failed.length} failed`);
  if (failed.length) console.log(`Failed: ${failed.join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
