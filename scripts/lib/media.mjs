/**
 * Image upload for the content scripts (replaces Strapi's POST /api/upload):
 * the original plus Strapi-style size variants go to S3, and a `files` record
 * with the same fields the Strapi Upload plugin produced (name / hash / ext /
 * mime / size / width / height / url / formats) is written so the copies
 * embedded in `featuredImage` stay uniform with the migrated media.
 */
import { randomBytes } from "node:crypto";
import { extname } from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { coll, getDb, newDocumentId, nextId } from "./mongo.mjs";

/**
 * @typedef {{ ext: string, url: string, hash: string, mime: string, name: string, path: null,
 *   size: number, width: number, height: number, sizeInBytes: number }} Variant
 * @typedef {{ id: number | null, documentId: string, name: string, alternativeText: null,
 *   caption: null, width: number | null, height: number | null,
 *   formats: Record<string, Variant> | null, hash: string, ext: string, mime: string,
 *   size: number, url: string, previewUrl: null, provider: string, provider_metadata: null,
 *   createdAt: Date, updatedAt: Date, publishedAt: Date, focalPoint: null, source: string,
 *   s3Key: string, objects?: string[] }} FileRecord
 */

// Strapi Upload plugin defaults: responsive breakpoints and the thumbnail box.
const BREAKPOINTS = { large: 1000, medium: 750, small: 500 };
const THUMBNAIL = { width: 245, height: 156 };
// `files.{source, id}` is unique per former Strapi instance; this site's media
// lives in the vivid-triumph space (same as the copies embedded in post4s).
export const SOURCE = "vivid";

/** @type {Record<string, string>} */
const EXT_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

export function envConfig() {
  return {
    bucket: process.env.S3_BUCKET ?? "",
    region: process.env.AWS_REGION ?? "eu-central-1",
    mediaBaseUrl: (process.env.MEDIA_BASE_URL ?? "").replace(/\/+$/, ""),
  };
}

/**
 * Strapi-like file hash: the base name with non-alphanumerics folded to `_`,
 * plus 8 random hex chars (object key = `uploads/<hash><ext>`).
 * @param {string} filename
 */
export function fileHash(filename) {
  const base =
    filename
      .replace(/\.[^.]+$/, "")
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "file";
  return `${base}_${randomBytes(4).toString("hex")}`;
}

/** Strapi's `bytesToKbytes`: sizes are stored in kB with two decimals (1 kB = 1000 B). @param {number} bytes */
export const kbytes = (bytes) => Math.round((bytes / 1000) * 100) / 100;

/** @param {import("sharp").Sharp} image */
async function resized(image, width, height) {
  const { data, info } = await image
    .clone()
    .resize({ width, height, fit: "inside", withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });
  return { buf: data, width: info.width, height: info.height };
}

/** Variants exactly where Strapi made them: only when the original exceeds the box. */
async function variants(image, { width = 0, height = 0 }) {
  /** @type {Record<string, { buf: Buffer, width: number, height: number }>} */
  const out = {};
  if (width > THUMBNAIL.width || height > THUMBNAIL.height) {
    out.thumbnail = await resized(image, THUMBNAIL.width, THUMBNAIL.height);
  }
  for (const [name, size] of Object.entries(BREAKPOINTS)) {
    if (width > size || height > size) out[name] = await resized(image, size, size);
  }
  return out;
}

/** `files` record store: ids come from the shared counter, like every other collection. */
function mongoFilesStore() {
  let seeded = false;
  return {
    async nextId() {
      if (!seeded) {
        // The migration seeded counters for content types only; bump the `files`
        // counter past the highest id already issued in this source's id space.
        const top = await (await coll("files"))
          .find({ source: SOURCE }, { projection: { id: 1 } })
          .sort({ id: -1 })
          .limit(1)
          .next();
        await (await getDb())
          .collection("counters")
          .updateOne({ _id: "files" }, { $max: { seq: top?.id ?? 0 } }, { upsert: true });
        seeded = true;
      }
      return nextId("files");
    },
    /** @param {FileRecord} record */
    async insert(record) {
      await (await coll("files")).insertOne({ ...record });
    },
  };
}

/**
 * @param {object} [o]
 * @param {{ send(command: PutObjectCommand): Promise<unknown> }} [o.s3]  injectable client (tests)
 * @param {string} [o.bucket]        defaults to S3_BUCKET
 * @param {string} [o.region]        defaults to AWS_REGION
 * @param {string} [o.mediaBaseUrl]  defaults to MEDIA_BASE_URL
 * @param {boolean} [o.dryRun]       process the image but upload / record nothing
 * @param {{ nextId(): Promise<number>, insert(record: FileRecord): Promise<void> }} [o.filesStore]
 */
export function createUploader({ s3, bucket, region, mediaBaseUrl, dryRun = false, filesStore } = {}) {
  const env = envConfig();
  const cfg = {
    bucket: bucket ?? env.bucket,
    region: region ?? env.region,
    mediaBaseUrl: (mediaBaseUrl ?? env.mediaBaseUrl).replace(/\/+$/, ""),
  };
  let client = s3 ?? null;
  const store = filesStore ?? mongoFilesStore();

  return {
    /**
     * Uploads one image; resolves to the `files` record (also the shape embedded in posts).
     * @param {Buffer} buf
     * @param {{ filename: string, contentType: string }} meta
     * @returns {Promise<FileRecord>}
     */
    async upload(buf, { filename, contentType }) {
      if (!dryRun && (!cfg.bucket || !cfg.mediaBaseUrl)) {
        throw new Error("S3_BUCKET / MEDIA_BASE_URL are not set");
      }
      const image = sharp(buf);
      const meta = await image.metadata();
      const ext = extname(filename).toLowerCase() || EXT_BY_MIME[contentType] || "";
      const hash = fileHash(filename);
      const key = `uploads/${hash}${ext}`;
      const objects = [{ key, body: buf }];
      /** @type {Record<string, Variant>} */
      const formats = {};
      for (const [name, v] of Object.entries(await variants(image, meta))) {
        const variantHash = `${name}_${hash}`;
        const variantKey = `uploads/${variantHash}${ext}`;
        objects.push({ key: variantKey, body: v.buf });
        formats[name] = {
          ext,
          url: `${cfg.mediaBaseUrl}/${variantKey}`,
          hash: variantHash,
          mime: contentType,
          name: `${name}_${filename}`,
          path: null,
          size: kbytes(v.buf.length),
          width: v.width,
          height: v.height,
          sizeInBytes: v.buf.length,
        };
      }
      const now = new Date();
      /** @type {FileRecord} */
      const record = {
        id: null,
        documentId: newDocumentId(),
        name: filename,
        alternativeText: null,
        caption: null,
        width: meta.width ?? null,
        height: meta.height ?? null,
        formats: Object.keys(formats).length ? formats : null,
        hash,
        ext,
        mime: contentType,
        size: kbytes(buf.length),
        url: `${cfg.mediaBaseUrl}/${key}`,
        previewUrl: null,
        provider: "aws-s3",
        provider_metadata: null,
        createdAt: now,
        updatedAt: now,
        publishedAt: now,
        focalPoint: null,
        source: SOURCE,
        s3Key: key,
      };
      if (dryRun) return { ...record, objects: objects.map((o) => o.key) };
      client ??= new S3Client({ region: cfg.region });
      for (const o of objects) {
        await client.send(
          new PutObjectCommand({
            Bucket: cfg.bucket,
            Key: o.key,
            Body: o.body,
            ContentType: contentType,
            CacheControl: "public, max-age=31536000, immutable",
          }),
        );
      }
      record.id = await store.nextId();
      await store.insert(record);
      return record;
    },
  };
}
