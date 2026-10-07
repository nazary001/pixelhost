import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import { createUploader, fileHash, kbytes } from "../scripts/lib/media.mjs";

interface PutInput {
  Bucket?: string;
  Key?: string;
  Body?: unknown;
  ContentType?: string;
}

function fakeS3() {
  const calls: PutInput[] = [];
  return {
    calls,
    send: async (command: { input: PutInput }) => {
      calls.push(command.input);
      return {};
    },
  };
}

function fakeStore() {
  const inserted: Record<string, unknown>[] = [];
  let seq = 41;
  return {
    inserted,
    nextId: async () => ++seq,
    insert: async (record: Record<string, unknown>) => {
      inserted.push(record);
    },
  };
}

const image = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: "#336699" } });

describe("media uploader (S3 mocked)", () => {
  it("uploads the original plus Strapi-style variants and returns a files record", async () => {
    const s3 = fakeS3();
    const store = fakeStore();
    const uploader = createUploader({ s3, bucket: "test-bucket", region: "eu-central-1", mediaBaseUrl: "https://cdn.example/", filesStore: store });
    const png = await image(1600, 900).png().toBuffer();
    const rec = await uploader.upload(png, { filename: "my-cover.png", contentType: "image/png" });

    assert.equal(rec.id, 42);
    assert.match(rec.hash, /^my_cover_[0-9a-f]{8}$/);
    assert.equal(rec.s3Key, `uploads/${rec.hash}.png`);
    assert.equal(rec.url, `https://cdn.example/uploads/${rec.hash}.png`);
    assert.equal(rec.name, "my-cover.png");
    assert.equal(rec.width, 1600);
    assert.equal(rec.height, 900);
    assert.equal(rec.ext, ".png");
    assert.equal(rec.mime, "image/png");
    assert.equal(rec.size, kbytes(png.length));
    assert.equal(rec.source, "vivid");
    assert.equal(rec.provider, "aws-s3");
    assert.ok(rec.createdAt instanceof Date && rec.publishedAt instanceof Date);
    assert.match(rec.documentId, /^[a-z0-9]{24}$/);
    assert.equal("_id" in rec, false);

    const formats = rec.formats;
    assert.ok(formats);
    assert.deepEqual(Object.keys(formats).sort(), ["large", "medium", "small", "thumbnail"]);
    assert.equal(formats.large.width, 1000);
    assert.equal(formats.large.height, 563);
    assert.equal(formats.thumbnail.width, 245);
    assert.equal(formats.thumbnail.height, 138);
    assert.equal(formats.medium.url, `https://cdn.example/uploads/medium_${rec.hash}.png`);
    assert.equal(formats.medium.hash, `medium_${rec.hash}`);
    assert.equal(formats.medium.name, "medium_my-cover.png");
    assert.equal(formats.small.mime, "image/png");

    assert.equal(s3.calls.length, 5);
    assert.deepEqual(
      s3.calls.map((c) => c.Key).sort(),
      ["", "large_", "medium_", "small_", "thumbnail_"].map((p) => `uploads/${p}${rec.hash}.png`).sort(),
    );
    assert.ok(s3.calls.every((c) => c.Bucket === "test-bucket" && c.ContentType === "image/png" && Buffer.isBuffer(c.Body)));
    assert.equal(store.inserted.length, 1);
    assert.equal(store.inserted[0].id, 42);
  });

  it("skips variants for images smaller than every breakpoint", async () => {
    const s3 = fakeS3();
    const uploader = createUploader({ s3, bucket: "b", mediaBaseUrl: "https://cdn.example", filesStore: fakeStore() });
    const jpg = await image(200, 100).jpeg().toBuffer();
    const rec = await uploader.upload(jpg, { filename: "tiny.jpg", contentType: "image/jpeg" });
    assert.equal(rec.formats, null);
    assert.equal(rec.width, 200);
    assert.equal(s3.calls.length, 1);
  });

  it("--dry-run processes the image but touches neither S3 nor the database", async () => {
    const s3 = fakeS3();
    const store = fakeStore();
    const uploader = createUploader({ s3, dryRun: true, filesStore: store, mediaBaseUrl: "https://cdn.example" });
    const png = await image(1200, 1200).png().toBuffer();
    const rec = await uploader.upload(png, { filename: "square.png", contentType: "image/png" });
    assert.equal(rec.id, null);
    assert.equal(rec.objects?.length, 5);
    assert.equal(s3.calls.length, 0);
    assert.equal(store.inserted.length, 0);
  });

  it("folds names and sizes like Strapi", () => {
    assert.match(fileHash("Doctor's Diagnosis Writing.png"), /^Doctor_s_Diagnosis_Writing_[0-9a-f]{8}$/);
    assert.match(fileHash("...png"), /^file_[0-9a-f]{8}$/);
    assert.equal(kbytes(134749), 134.75);
  });
});
