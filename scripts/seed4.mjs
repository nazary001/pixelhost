/**
 * Seeds the PixelHost post4 / category4 / author4 collections in the shared
 * (nice-advice family) MongoDB from scripts/articles.json (written by gen4.mjs).
 * Cover images are CC0 photos from the Openverse API, uploaded to S3.
 *
 * Run:  node --env-file=.env.local scripts/seed4.mjs [articles-file.json] [--dry-run]
 * Needs MONGODB_URI (+ MONGODB_DB), MEDIA_BASE_URL, S3_BUCKET, AWS_REGION and
 * AWS credentials (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY) allowed to
 * PutObject into the bucket. --dry-run only reads: it prints what would be
 * created and uploads / writes nothing.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createUploader } from "./lib/media.mjs";
import { coll, getClient, newDoc } from "./lib/mongo.mjs";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const ARTICLES_FILE = args.find((a) => !a.startsWith("--")) ?? "articles.json";
const USED_IMAGES_PATH = resolve(import.meta.dirname, "used-images.json");

function loadUsedImages() {
  try {
    return new Set(JSON.parse(readFileSync(USED_IMAGES_PATH, "utf8")));
  } catch {
    return new Set();
  }
}
const usedImages = loadUsedImages();

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is not set.");
  process.exit(1);
}
if (!DRY && (!process.env.S3_BUCKET || !process.env.MEDIA_BASE_URL)) {
  console.error("S3_BUCKET / MEDIA_BASE_URL are not set.");
  process.exit(1);
}
const uploader = createUploader({ dryRun: DRY });

const CATEGORIES = [
  { name: "Web Hosting", slug: "web-hosting", description: "How hosting works and how to choose it — shared, VPS, cloud and dedicated, explained without the jargon." },
  { name: "WordPress", slug: "wordpress", description: "Hosting, speed, security and plugins for WordPress — keep your site fast, safe and easy to run." },
  { name: "Domains", slug: "domains", description: "Registering, pointing and transferring domains, plus DNS and email basics, made painless." },
  { name: "Website Builders", slug: "website-builders", description: "Builders, CMS platforms and the fastest ways to get a real website online — compared honestly." },
  { name: "Reviews", slug: "reviews", description: "Hands-on looks at hosting providers, builders and tools, with the fine print and pricing read for you." },
];

const p = (text) => ({ type: "paragraph", children: [{ type: "text", text }] });

const AUTHORS = [
  { name: "Alex Mercer", slug: "alex-mercer", role: "Hosting & Infrastructure Writer",
    bio: [p("Alex breaks down web hosting, servers and performance for people who just want their site to be fast and online. He has migrated more sites between hosts than he cares to count.")] },
  { name: "Sofia Ramos", slug: "sofia-ramos", role: "WordPress & CMS Specialist",
    bio: [p("Sofia writes about WordPress, website builders and getting a real site live without a developer. She is happiest when a page loads in under a second.")] },
  { name: "Liam Carter", slug: "liam-carter", role: "Domains & DNS Researcher",
    bio: [p("Liam covers domains, DNS and the plumbing that connects a name to a website. His focus is the steps people get stuck on when they go to launch.")] },
];

/** Find-or-create by slug; returns the `{ id, documentId }` relation ref. */
async function ensureEntry(collection, slug, payload) {
  const c = await coll(collection);
  const found = await c.findOne({ slug }, { projection: { id: 1, documentId: 1 } });
  if (found) {
    console.log(`  = ${collection}/${slug} already exists`);
    return { id: found.id, documentId: found.documentId };
  }
  if (DRY) {
    console.log(`  + would create ${collection}/${slug}`);
    return { id: 0, documentId: `dry-run-${slug}` };
  }
  const doc = await newDoc(collection, { ...payload, posts: [] }, { publish: true });
  await c.insertOne(doc);
  console.log(`  + created ${collection}/${slug}`);
  return { id: doc.id, documentId: doc.documentId };
}

async function findCc0Image(query) {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&license=cc0&page_size=20`;
  const res = await fetch(url, { headers: { "User-Agent": "PixelHostSeeder/1.0" } });
  if (!res.ok) throw new Error(`Openverse search failed: ${res.status}`);
  const body = await res.json();
  const results = Array.isArray(body.results) ? body.results : [];
  return [
    ...results.filter((r) => (r.width ?? 0) >= 1200),
    ...results.filter((r) => (r.width ?? 0) >= 900 && (r.width ?? 0) < 1200),
    ...results.filter((r) => (r.width ?? 0) < 900),
  ];
}

async function downloadImage(candidates) {
  const fresh = candidates.filter((c) => !usedImages.has(c.url));
  for (const candidate of fresh.slice(0, 8)) {
    try {
      const res = await fetch(candidate.url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; PixelHostSeeder/1.0)" },
        redirect: "follow",
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) continue;
      const contentType = res.headers.get("content-type") ?? "image/jpeg";
      if (!contentType.startsWith("image/")) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 30_000) continue;
      usedImages.add(candidate.url);
      writeFileSync(USED_IMAGES_PATH, JSON.stringify([...usedImages], null, 2));
      return { buf, contentType: contentType.split(";")[0] };
    } catch {
      // next candidate
    }
  }
  return null;
}

function sectionsToBlocks(sections) {
  const blocks = [];
  for (const section of sections) {
    if (section.type === "h2" && section.text) {
      blocks.push({ type: "heading", level: 2, children: [{ type: "text", text: section.text }] });
    } else if (section.type === "h3" && section.text) {
      blocks.push({ type: "heading", level: 3, children: [{ type: "text", text: section.text }] });
    } else if (section.type === "p" && section.text) {
      blocks.push(p(section.text));
    } else if (section.type === "ul" && Array.isArray(section.items)) {
      blocks.push({
        type: "list",
        format: "unordered",
        children: section.items.map((item) => ({ type: "list-item", children: [{ type: "text", text: item }] })),
      });
    }
  }
  return blocks;
}

async function createArticle(entry, categoryRefs, authorRefs, idx) {
  const { article, category } = entry;
  const posts = await coll("post4s");
  const existing = await posts.findOne({ slug: article.slug }, { projection: { _id: 1 } });
  if (existing) {
    console.log(`  = article "${article.slug}" already exists, skipping`);
    return "skipped";
  }
  const query = entry.imageQuery ?? (article.tags ?? []).slice(0, 3).join(" ") ?? "web hosting server";
  let featuredImage = null;
  if (DRY) {
    console.log(`  ~ would find a CC0 cover for "${article.slug}" (query: ${query}) and upload it to S3`);
  } else {
    try {
      const candidates = await findCc0Image(query);
      const image = await downloadImage(candidates);
      if (image) {
        const ext = image.contentType.includes("png") ? "png" : "jpg";
        featuredImage = await uploader.upload(image.buf, {
          filename: `${article.slug}-cover.${ext}`,
          contentType: image.contentType,
        });
        console.log(`  ↑ image uploaded for "${article.slug}" (${featuredImage.s3Key}, files id ${featuredImage.id})`);
      } else {
        console.warn(`  ! no usable CC0 image for "${article.slug}" (query: ${query})`);
      }
    } catch (err) {
      console.warn(`  ! image step failed for "${article.slug}": ${err.message}`);
    }
  }

  const categoryRef = categoryRefs[category];
  const authorRef = authorRefs[AUTHORS[idx % AUTHORS.length].slug];
  const data = {
    title: article.title,
    slug: article.slug,
    description: article.description,
    content: sectionsToBlocks(article.sections),
    featuredImage,
    contentImage1: null,
    contentImage2: null,
    category: categoryRef,
    author: authorRef,
    tags: article.tags ?? [],
    views: Math.floor(Math.random() * 160) + 25,
    isPopular: idx < 4,
  };
  if (DRY) {
    console.log(`  ✓ would publish "${article.title}" (${category}, author ${authorRef.documentId})`);
    return "published";
  }
  const doc = await newDoc("post4s", data, { publish: true });
  await posts.insertOne(doc);
  // Keep the inverse (oneToMany) sides in step, as Strapi did.
  const ref = { id: doc.id, documentId: doc.documentId };
  await (await coll("category4s")).updateOne({ documentId: categoryRef.documentId }, { $addToSet: { posts: ref } });
  await (await coll("author4s")).updateOne({ documentId: authorRef.documentId }, { $addToSet: { posts: ref } });
  console.log(`  ✓ published "${article.title}"`);
  return "published";
}

async function main() {
  const articles = JSON.parse(readFileSync(resolve(import.meta.dirname, ARTICLES_FILE), "utf8"));
  console.log(`Seeding ${articles.length} articles from ${ARTICLES_FILE} into ${process.env.MONGODB_DB || "gc"}${DRY ? " (dry run)" : ""}\n`);

  console.log("Categories:");
  const categoryRefs = {};
  for (const c of CATEGORIES) categoryRefs[c.slug] = await ensureEntry("category4s", c.slug, c);

  console.log("Authors:");
  const authorRefs = {};
  for (const a of AUTHORS) authorRefs[a.slug] = await ensureEntry("author4s", a.slug, { ...a, avatar: null });

  console.log("Articles:");
  let published = 0, skipped = 0;
  const failed = [];
  for (let i = 0; i < articles.length; i++) {
    try {
      const r = await createArticle(articles[i], categoryRefs, authorRefs, i);
      if (r === "published") published++; else skipped++;
    } catch (err) {
      console.error(`  ✗ "${articles[i].article?.slug}": ${err.message}`);
      failed.push(articles[i].article?.slug);
    }
  }
  console.log(`\nDone: ${published} ${DRY ? "would be " : ""}published, ${skipped} skipped, ${failed.length} failed`);
  if (failed.length) console.log(`Failed: ${failed.join(", ")}`);
  await (await getClient()).close();
}

main().catch((err) => { console.error(err); process.exit(1); });
