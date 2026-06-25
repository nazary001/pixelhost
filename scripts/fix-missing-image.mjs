/** One-off: find a CC0 cover for an article that seeded without one. */
const STRAPI_URL = (process.env.STRAPI_API_URL ?? "").replace(/\/+$/, "");
const STRAPI_TOKEN = process.env.STRAPI_TOKEN ?? "";
const AUTH = { Authorization: `Bearer ${STRAPI_TOKEN}` };

const SLUG = "government-benefits-guide";
const QUERIES = [
  "tax forms calculator desk",
  "paperwork documents table",
  "filling form pen paper",
  "government building columns",
];

async function findAndDownload() {
  for (const q of QUERIES) {
    const res = await fetch(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&license=cc0&page_size=20`,
      { headers: { "User-Agent": "MKLernSeeder/1.0" } },
    );
    if (!res.ok) continue;
    const { results = [] } = await res.json();
    const ranked = [...results].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
    for (const c of ranked.slice(0, 6)) {
      try {
        const img = await fetch(c.url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; MKLernSeeder/1.0)" },
          signal: AbortSignal.timeout(30000),
        });
        if (!img.ok) continue;
        const type = (img.headers.get("content-type") ?? "image/jpeg").split(";")[0];
        if (!type.startsWith("image/")) continue;
        const buf = Buffer.from(await img.arrayBuffer());
        if (buf.length < 30_000) continue;
        console.log(`found image via "${q}" (${c.width}x${c.height}, ${Math.round(buf.length / 1024)}KB)`);
        return { buf, type };
      } catch {
        /* next */
      }
    }
  }
  return null;
}

const image = await findAndDownload();
if (!image) {
  console.error("Still no usable image found.");
  process.exit(1);
}

const form = new FormData();
form.append(
  "files",
  new Blob([image.buf], { type: image.type }),
  `${SLUG}-cover.${image.type.includes("png") ? "png" : "jpg"}`,
);
const up = await fetch(`${STRAPI_URL}/api/upload`, { method: "POST", headers: AUTH, body: form });
if (!up.ok) {
  console.error("upload failed:", up.status, await up.text());
  process.exit(1);
}
const [{ id }] = await up.json();
console.log("uploaded, media id", id);

const found = await fetch(
  `${STRAPI_URL}/api/mklern-articles?filters[slug][$eq]=${SLUG}`,
  { headers: AUTH },
).then((r) => r.json());
const documentId = found.data?.[0]?.documentId;
if (!documentId) {
  console.error("article not found");
  process.exit(1);
}

const put = await fetch(`${STRAPI_URL}/api/mklern-articles/${documentId}?status=published`, {
  method: "PUT",
  headers: { ...AUTH, "Content-Type": "application/json" },
  body: JSON.stringify({ data: { featuredImage: id } }),
});
if (!put.ok) {
  console.error("update failed:", put.status, await put.text());
  process.exit(1);
}
console.log(`✓ cover attached to "${SLUG}"`);
