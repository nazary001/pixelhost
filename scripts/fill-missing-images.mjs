/**
 * Finds CC0 covers for published mklern articles that have no featuredImage,
 * using per-slug fallback queries and the used-images.json registry so no
 * photo repeats across the site.
 *
 * Run:  node --env-file=.env.local scripts/fill-missing-images.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const STRAPI_URL = (process.env.STRAPI_API_URL ?? "").replace(/\/+$/, "");
const STRAPI_TOKEN = process.env.STRAPI_TOKEN ?? "";
const AUTH = { Authorization: `Bearer ${STRAPI_TOKEN}` };

const USED_IMAGES_PATH = resolve(import.meta.dirname, "used-images.json");
let usedImages;
try {
  usedImages = new Set(JSON.parse(readFileSync(USED_IMAGES_PATH, "utf8")));
} catch {
  usedImages = new Set();
}

const FALLBACK_QUERIES = {
  "what-is-a-credit-report": ["paperwork stack", "office documents", "folders office"],
  "what-is-apr": ["signing contract", "pen paper document", "agreement papers"],
  "the-50-30-20-budget": ["budget", "money planning", "wallet money table"],
  "what-is-the-fafsa": ["writing form", "student desk writing", "filling paperwork"],
  "micro-credentials-explained": ["certificate", "diploma", "award medal"],
  "how-to-finish-an-online-course": ["studying laptop", "home office desk", "notebook study"],
  "project-management-certifications": ["whiteboard meeting", "team office", "planning notes"],
  "how-student-loan-interest-works": ["chart graph", "calculator money", "growth coins"],
  "student-loan-forgiveness-programs": ["rubber stamp", "documents desk", "paper approval"],
  "cosigning-a-student-loan": ["handshake agreement", "signing document", "meeting table"],
  "codecademy-review": ["code screen", "programming laptop", "computer code"],
  "pluralsight-review": ["dual monitors desk", "computer workstation", "tech office desk"],
  "what-is-a-roth-ira": ["retirement savings", "piggy bank", "nest egg", "coins jar"],
  "ai-prompt-engineering-courses-worth-it": ["artificial intelligence", "laptop code", "computer desk"],
  "what-is-a-credit-freeze": ["security lock", "padlock", "lock keyboard"],
  "deferment-vs-forbearance": ["calendar planning", "desk calendar", "notebook planning"],
  "brilliant-org-review": ["tablet learning", "math study", "student tablet"],
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

async function findImage(queries) {
  for (const q of queries) {
    const res = await fetch(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&license=cc0&page_size=20`,
      { headers: { "User-Agent": "MKLernSeeder/1.0" } },
    );
    if (!res.ok) continue;
    const { results = [] } = await res.json();
    const ranked = [...results]
      .filter((r) => !usedImages.has(r.url))
      .sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
    for (const candidate of ranked.slice(0, 8)) {
      try {
        const img = await fetch(candidate.url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; MKLernSeeder/1.0)" },
          redirect: "follow",
          signal: AbortSignal.timeout(30000),
        });
        if (!img.ok) continue;
        const contentType = (img.headers.get("content-type") ?? "image/jpeg").split(";")[0];
        if (!contentType.startsWith("image/")) continue;
        const buf = Buffer.from(await img.arrayBuffer());
        if (buf.length < 30_000) continue;
        usedImages.add(candidate.url);
        writeFileSync(USED_IMAGES_PATH, JSON.stringify([...usedImages], null, 2));
        console.log(`  found via "${q}" (${candidate.width}x${candidate.height})`);
        return { buf, contentType };
      } catch {
        // next candidate
      }
    }
  }
  return null;
}

let fixed = 0;
const stillMissing = [];

for (const [slug, queries] of Object.entries(FALLBACK_QUERIES)) {
  console.log(`"${slug}":`);
  try {
    const found = await api(
      `mklern-articles?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=featuredImage`,
    );
    const article = found.data?.[0];
    if (!article) throw new Error("article not found");
    if (article.featuredImage?.url) {
      console.log("  already has a cover, skipping");
      continue;
    }

    const image = await findImage(queries);
    if (!image) {
      console.warn("  ! still no usable image");
      stillMissing.push(slug);
      continue;
    }

    const form = new FormData();
    form.append(
      "files",
      new Blob([image.buf], { type: image.contentType }),
      `${slug}-cover.${image.contentType.includes("png") ? "png" : "jpg"}`,
    );
    const up = await fetch(`${STRAPI_URL}/api/upload`, { method: "POST", headers: AUTH, body: form });
    if (!up.ok) throw new Error(`upload -> ${up.status}`);
    const [{ id }] = await up.json();

    await api(`mklern-articles/${article.documentId}?status=published`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { featuredImage: id } }),
    });
    console.log(`  ✓ cover attached (media ${id})`);
    fixed++;
  } catch (err) {
    console.error(`  ✗ ${err.message}`);
    stillMissing.push(slug);
  }
}

console.log(`\nDone: ${fixed} covers attached, ${stillMissing.length} still missing`);
if (stillMissing.length) console.log(`Missing: ${stillMissing.join(", ")}`);
