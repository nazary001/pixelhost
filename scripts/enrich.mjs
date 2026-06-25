/**
 * Applies the enrichments from scripts/enrichments.json to the published
 * mklern articles: inserts a "Key Takeaways" box after the intro, and appends
 * "Frequently Asked Questions" and "Sources & Further Reading" sections
 * (links only to the pre-validated official URLs).
 *
 * Run:  node --env-file=.env.local scripts/enrich.mjs
 * Idempotent: articles that already contain the Sources section are skipped.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const STRAPI_URL = (process.env.STRAPI_API_URL ?? "").replace(/\/+$/, "");
const STRAPI_TOKEN = process.env.STRAPI_TOKEN ?? "";
const AUTH = { Authorization: `Bearer ${STRAPI_TOKEN}` };

const text = (t) => ({ type: "text", text: t });
const p = (t) => ({ type: "paragraph", children: [text(t)] });
const h2 = (t) => ({ type: "heading", level: 2, children: [text(t)] });
const h3 = (t) => ({ type: "heading", level: 3, children: [text(t)] });
const ul = (items) => ({
  type: "list",
  format: "unordered",
  children: items.map((children) => ({
    type: "list-item",
    children: Array.isArray(children) ? children : [text(children)],
  })),
});
const link = (url, label) => ({ type: "link", url, children: [text(label)] });

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

function buildContent(original, enrichment) {
  const blocks = [...original];

  // Key Takeaways go right before the first heading (after the intro).
  const firstHeading = blocks.findIndex((b) => b.type === "heading");
  const insertAt = firstHeading === -1 ? blocks.length : firstHeading;
  blocks.splice(insertAt, 0, h2("Key Takeaways"), ul(enrichment.takeaways));

  blocks.push(h2("Frequently Asked Questions"));
  for (const { q, a } of enrichment.faq) {
    blocks.push(h3(q), p(a));
  }

  blocks.push(
    h2("Sources & Further Reading"),
    ul(
      enrichment.references.map((ref) => [
        link(ref.url, ref.label),
        text(ref.note ? ` — ${ref.note}` : ""),
      ]),
    ),
    p("All sources above are official or first-party pages. Program terms change — always confirm details on the official site before making decisions."),
  );

  return blocks;
}

// Usage: node --env-file=.env.local scripts/enrich.mjs [enrichments-file.json]
const ENRICH_FILE = process.argv[2] ?? "enrichments.json";
const enrichments = JSON.parse(
  readFileSync(resolve(import.meta.dirname, ENRICH_FILE), "utf8"),
);

let updated = 0;
let skipped = 0;
const failed = [];

for (const enrichment of enrichments) {
  try {
    const found = await api(
      `mklern-articles?filters[slug][$eq]=${encodeURIComponent(enrichment.slug)}`,
    );
    const article = found.data?.[0];
    if (!article) throw new Error("article not found");

    const alreadyEnriched = (article.content ?? []).some(
      (b) =>
        b.type === "heading" &&
        (b.children ?? []).some((c) => (c.text ?? "").includes("Sources & Further Reading")),
    );
    if (alreadyEnriched) {
      console.log(`= "${enrichment.slug}" already enriched, skipping`);
      skipped++;
      continue;
    }

    const content = buildContent(article.content ?? [], enrichment);
    await api(`mklern-articles/${article.documentId}?status=published`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { content } }),
    });
    console.log(`✓ enriched "${enrichment.slug}" (+takeaways, +${enrichment.faq.length} FAQ, +${enrichment.references.length} refs)`);
    updated++;
  } catch (err) {
    console.error(`✗ "${enrichment.slug}": ${err.message}`);
    failed.push(enrichment.slug);
  }
}

console.log(`\nDone: ${updated} updated, ${skipped} skipped, ${failed.length} failed`);
if (failed.length) console.log(`Failed: ${failed.join(", ")}`);
