/**
 * Attaches CC0 portrait photos (via Openverse) as avatars to the mklern
 * authors. Reuses the used-images.json registry so avatars never collide
 * with article covers or each other.
 *
 * Run:  node --env-file=.env.local scripts/author-avatars.mjs
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

const AUTHOR_QUERIES = {
  "daniel-hayes": ["man portrait professional", "businessman portrait", "man smiling portrait"],
  "priya-raman": ["indian woman portrait", "woman professional portrait", "woman smiling portrait"],
  "marcus-webb": ["man portrait beard", "man glasses portrait", "young man portrait"],
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

async function findPortrait(queries) {
  for (const q of queries) {
    const res = await fetch(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&license=cc0&page_size=20`,
      { headers: { "User-Agent": "MKLernSeeder/1.0" } },
    );
    if (!res.ok) continue;
    const { results = [] } = await res.json();
    // Portraits: prefer images that are tall-ish or square and big enough.
    const ranked = results
      .filter((r) => !usedImages.has(r.url))
      .filter((r) => (r.width ?? 0) >= 400 && (r.height ?? 0) >= 400)
      .sort((a, b) => {
        const ratioA = Math.abs((a.width ?? 1) / (a.height ?? 1) - 0.9);
        const ratioB = Math.abs((b.width ?? 1) / (b.height ?? 1) - 0.9);
        return ratioA - ratioB;
      });
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
        if (buf.length < 20_000) continue;
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

let attached = 0;
for (const [slug, queries] of Object.entries(AUTHOR_QUERIES)) {
  console.log(`"${slug}":`);
  try {
    const found = await api(
      `mklern-authors?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=avatar`,
    );
    const author = found.data?.[0];
    if (!author) throw new Error("author not found");
    if (author.avatar?.url) {
      console.log("  already has an avatar, skipping");
      continue;
    }

    const portrait = await findPortrait(queries);
    if (!portrait) {
      console.warn("  ! no usable portrait found");
      continue;
    }

    const form = new FormData();
    form.append(
      "files",
      new Blob([portrait.buf], { type: portrait.contentType }),
      `${slug}-avatar.${portrait.contentType.includes("png") ? "png" : "jpg"}`,
    );
    const up = await fetch(`${STRAPI_URL}/api/upload`, { method: "POST", headers: AUTH, body: form });
    if (!up.ok) throw new Error(`upload -> ${up.status}`);
    const [{ id }] = await up.json();

    await api(`mklern-authors/${author.documentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { avatar: id } }),
    });
    console.log(`  ✓ avatar attached (media ${id})`);
    attached++;
  } catch (err) {
    console.error(`  ✗ ${err.message}`);
  }
}

console.log(`\nDone: ${attached} avatars attached`);
