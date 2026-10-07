/**
 * Attaches CC0 cover images to post4 articles that are missing featuredImage.
 * Run: node --env-file=.env.local scripts/backfill-images4.mjs [--dry-run]
 * Needs MONGODB_URI, MEDIA_BASE_URL, S3_BUCKET, AWS_REGION + AWS credentials.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createUploader } from "./lib/media.mjs";
import { coll, getClient } from "./lib/mongo.mjs";

const DRY = process.argv.includes("--dry-run");
if (!process.env.MONGODB_URI) { console.error("MONGODB_URI is not set."); process.exit(1); }
if (!DRY && (!process.env.S3_BUCKET || !process.env.MEDIA_BASE_URL)) { console.error("S3_BUCKET / MEDIA_BASE_URL are not set."); process.exit(1); }
const uploader = createUploader({ dryRun: DRY });
const USED = resolve(import.meta.dirname, "used-images.json");
const used = (() => { try { return new Set(JSON.parse(readFileSync(USED, "utf8"))); } catch { return new Set(); } })();

const QUERY_BY_CAT = {
  "web-hosting": ["server room", "data center", "network server", "technology server"],
  "wordpress": ["laptop website", "blog laptop", "web development", "coding laptop"],
  "domains": ["computer keyboard", "internet browser", "search bar screen", "laptop typing"],
  "website-builders": ["web design", "website mockup", "designer desk", "creative workspace"],
  "reviews": ["laptop office desk", "comparing laptop", "workspace coffee", "office technology"],
};

async function cc0(query) {
  const res = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&license=cc0&page_size=20`, { headers: { "User-Agent": "PixelHostSeeder/1.0" } });
  if (!res.ok) return [];
  const b = await res.json();
  const r = Array.isArray(b.results) ? b.results : [];
  return [...r.filter((x) => (x.width ?? 0) >= 1000), ...r.filter((x) => (x.width ?? 0) < 1000)];
}
function isRaster(buf) {
  if (!buf || buf.length < 12) return false;
  const a = buf.toString("latin1", 0, 12);
  if (buf[0] === 0xff && buf[1] === 0xd8) return true; // JPEG
  if (buf[0] === 0x89 && buf[1] === 0x50) return true; // PNG
  if (a.startsWith("GIF8")) return true; // GIF
  if (a.startsWith("RIFF") && a.slice(8, 12) === "WEBP") return true; // WebP
  return false;
}
async function download(cands) {
  for (const c of cands.filter((x) => !used.has(x.url)).slice(0, 8)) {
    try {
      const res = await fetch(c.url, { headers: { "User-Agent": "Mozilla/5.0 (PixelHostSeeder/1.0)" }, redirect: "follow", signal: AbortSignal.timeout(30000) });
      if (!res.ok) continue;
      const ct = res.headers.get("content-type") ?? "image/jpeg";
      if (!ct.startsWith("image/") || ct.includes("svg")) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 30000 || !isRaster(buf)) continue;
      used.add(c.url); writeFileSync(USED, JSON.stringify([...used], null, 2));
      return { buf, ct: ct.split(";")[0] };
    } catch { /* next */ }
  }
  return null;
}

const posts = await coll("post4s");
// Published articles only (what the Strapi default status filter returned).
const all = await posts
  .find({ publishedAt: { $ne: null } }, { projection: { slug: 1, documentId: 1, category: 1, "featuredImage.url": 1 } })
  .toArray();
const categorySlugs = new Map(
  (await (await coll("category4s")).find({}, { projection: { documentId: 1, slug: 1 } }).toArray()).map((c) => [c.documentId, c.slug]),
);
const missing = all.filter((a) => !a.featuredImage?.url);
console.log(`${all.length} articles, ${missing.length} missing covers${DRY ? " (dry run)" : ""}`);
for (const a of missing) {
  const cat = categorySlugs.get(a.category?.documentId) ?? "web-hosting";
  const queries = QUERY_BY_CAT[cat] ?? ["technology laptop"];
  if (DRY) { console.log(`  ~ would search ${JSON.stringify(queries)} for ${a.slug} and upload the cover to S3`); continue; }
  let image = null;
  for (const q of queries) {
    const img = await download(await cc0(q));
    if (img) {
      image = await uploader.upload(img.buf, { filename: `${a.slug}-cover.${img.ct.includes("png") ? "png" : "jpg"}`, contentType: img.ct });
      break;
    }
  }
  if (!image) { console.warn(`  ! still no image for ${a.slug}`); continue; }
  await posts.updateOne({ documentId: a.documentId }, { $set: { featuredImage: image, updatedAt: new Date() } });
  console.log(`  ✓ ${a.slug} -> ${image.s3Key} (files id ${image.id})`);
}
console.log("done");
await (await getClient()).close();
