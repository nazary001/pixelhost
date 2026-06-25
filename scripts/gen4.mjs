/**
 * Generates hosting-niche articles for PixelHost via the Gemini API and writes
 * scripts/articles.json in the shape seed4.mjs consumes.
 *
 * Run:  GEMINI_API_KEY=... node scripts/gen4.mjs
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const KEY = process.env.GEMINI_API_KEY ?? "";
if (!KEY) { console.error("GEMINI_API_KEY not set"); process.exit(1); }
const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;

const TOPICS = [
  { slug: "what-is-web-hosting", category: "web-hosting", imageQuery: "server data center racks", topic: "What Is Web Hosting? A Plain-English Beginner's Guide" },
  { slug: "shared-vs-vps-vs-cloud-vs-dedicated-hosting", category: "web-hosting", imageQuery: "servers network cables", topic: "Shared vs VPS vs Cloud vs Dedicated Hosting: How to Choose" },
  { slug: "how-to-choose-a-web-host", category: "web-hosting", imageQuery: "person laptop checklist", topic: "How to Choose a Web Host: 8 Things That Actually Matter" },
  { slug: "how-to-speed-up-a-wordpress-site", category: "wordpress", imageQuery: "wordpress laptop speed", topic: "How to Speed Up a WordPress Site: A Practical Guide" },
  { slug: "managed-vs-unmanaged-wordpress-hosting", category: "wordpress", imageQuery: "wordpress dashboard laptop", topic: "Managed vs Unmanaged WordPress Hosting: Which Do You Need?" },
  { slug: "how-to-register-a-domain-name", category: "domains", imageQuery: "domain name search screen", topic: "How to Register a Domain Name Without the Common Mistakes" },
  { slug: "what-is-dns", category: "domains", imageQuery: "network globe connections", topic: "What Is DNS? A Plain-English Guide for Website Owners" },
  { slug: "website-builder-vs-wordpress", category: "website-builders", imageQuery: "website design laptop", topic: "Website Builder vs WordPress: Which Is Right for You?" },
  { slug: "how-to-get-your-website-online", category: "website-builders", imageQuery: "launching website laptop desk", topic: "How to Get Your Website Online: A Step-by-Step Guide" },
  { slug: "cheap-web-hosting-what-you-get", category: "reviews", imageQuery: "budget piggy bank laptop", topic: "Cheap Web Hosting: What You Actually Get for the Price" },
];

const schema = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["h2", "p", "ul"] },
          text: { type: "string" },
          items: { type: "array", items: { type: "string" } },
        },
        required: ["type"],
      },
    },
  },
  required: ["title", "description", "tags", "sections"],
};

function prompt(t) {
  return `You are writing for PixelHost, an independent web-hosting content site (topics: web hosting, domains, WordPress, website builders).
Write a thorough, accurate, plain-language article for the "${t.category}" category on the topic: "${t.topic}".
Audience: everyday people choosing hosting/domains/builders — not engineers.

Requirements:
- 700-1000 words total.
- Begin with 1-2 intro paragraphs (type "p") BEFORE any heading.
- Then 4-6 "h2" sections, each followed by 1-3 "p" paragraphs.
- Include at least one "ul" bulleted list with 3-6 concrete items.
- Neutral, factual, evergreen. Do NOT invent specific prices, brand names presented as fact, or made-up statistics. Speak in ranges and general guidance.
- A "title" (you may refine the topic into a clean headline).
- A "description": a compelling meta description, ~150 characters, no clickbait.
- "tags": 4-6 short lowercase tags.
- "sections": ordered array. type "h2"=heading (use "text"), "p"=paragraph (use "text"), "ul"=bullet list (use "items").
Return ONLY JSON matching the schema.`;
}

async function generate(t) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt(t) }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.7 },
    }),
    signal: AbortSignal.timeout(120000),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(body?.error ?? body)?.slice(0, 200)}`);
  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("empty response");
  const a = JSON.parse(text);
  // basic shape guard
  if (!a.title || !Array.isArray(a.sections) || a.sections.length < 3) throw new Error("malformed article");
  return a;
}

async function main() {
  const out = [];
  for (const t of TOPICS) {
    process.stdout.write(`Generating "${t.slug}" ... `);
    try {
      const a = await generate(t);
      out.push({
        article: { title: a.title, slug: t.slug, description: a.description, tags: a.tags ?? [], sections: a.sections },
        category: t.category,
        imageQuery: t.imageQuery,
      });
      const words = a.sections.filter((s) => s.text).reduce((n, s) => n + s.text.split(/\s+/).length, 0);
      console.log(`ok (${a.sections.length} sections, ~${words} words)`);
    } catch (err) {
      console.log(`FAIL: ${err.message}`);
    }
  }
  const path = resolve(import.meta.dirname, "articles.json");
  writeFileSync(path, JSON.stringify(out, null, 2));
  console.log(`\nWrote ${out.length}/${TOPICS.length} articles to ${path}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
