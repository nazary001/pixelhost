import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { MongoClient } from "mongodb";

// The data layer reads MONGODB_DB when it is imported; writes must never hit `gc`.
process.env.MONGODB_DB = "gc_test";
process.env.MEDIA_BASE_URL ??= "https://cdn.example";
if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI is required (the tests use the gc_test database)");
}

const content = await import("@/lib/content");
const mongo = await import("@/lib/mongo");

type Doc = Record<string, unknown>;
const COLLECTIONS = ["post4s", "category4s", "author4s", "contact4s"] as const;
const d = (iso: string) => new Date(iso);
const docId = (seed: string) => seed.padEnd(24, "x").slice(0, 24);
const ref = (id: number, seed: string) => ({ id, documentId: docId(seed) });
const paragraph = (text: string) => ({ type: "paragraph", children: [{ type: "text", text }] });
const stamps = {
  createdAt: d("2026-01-01T00:00:00Z"),
  updatedAt: d("2026-01-02T00:00:00Z"),
  publishedAt: d("2026-01-02T00:00:00Z"),
  strapiStatus: "published",
};

const categories: Doc[] = [
  { id: 2, documentId: docId("cat1"), name: "Web Hosting", slug: "web-hosting", description: "Hosting basics", posts: [], ...stamps },
  { id: 4, documentId: docId("cat2"), name: "Domains", slug: "domains", description: null, posts: [], ...stamps },
  { id: 6, documentId: docId("catdraft"), name: "Draft Category", slug: "draft-cat", description: null, posts: [], ...stamps, publishedAt: null, strapiStatus: "draft" },
];
const authors: Doc[] = [
  { id: 2, documentId: docId("auth1"), name: "Alex Mercer", slug: "alex-mercer", role: "Hosting Writer", bio: [paragraph("Alex writes about hosting.")], avatar: null, posts: [], ...stamps },
  { id: 4, documentId: docId("auth2"), name: "Sofia Ramos", slug: "sofia-ramos", role: null, bio: null, avatar: { url: "https://cdn.example/uploads/sofia.jpg", width: 320, height: 320 }, posts: [], ...stamps },
];

function post(over: Doc & { id: number; slug: string }): Doc {
  return {
    documentId: docId(over.slug.replace(/[^a-z0-9]/g, "")),
    title: `Title ${over.slug}`,
    description: `Description ${over.slug}`,
    content: [paragraph("Body text ".repeat(50))],
    featuredImage: null,
    contentImage1: null,
    contentImage2: null,
    category: ref(2, "cat1"),
    author: ref(2, "auth1"),
    tags: ["hosting", 7],
    views: 10,
    isPopular: false,
    ...stamps,
    ...over,
  };
}

const posts: Doc[] = [
  post({ id: 10, slug: "p-newest", publishedAt: d("2026-03-03T00:00:00Z"), updatedAt: d("2026-03-04T00:00:00Z"), featuredImage: { url: "https://cdn.example/uploads/a.jpg", width: 1200, height: 800 } }),
  post({ id: 11, slug: "p-middle", title: "Middle C++ Guide", description: "Compare SHARED plans side by side", publishedAt: d("2026-02-02T00:00:00Z"), author: ref(4, "auth2") }),
  post({ id: 12, slug: "p-oldest", publishedAt: d("2026-01-01T00:00:00Z"), updatedAt: d("2025-12-31T00:00:00Z") }),
  post({ id: 13, slug: "p-domains", title: "Domain Basics", category: ref(4, "cat2"), author: null, publishedAt: d("2026-02-15T00:00:00Z") }),
  post({ id: 14, slug: "p-draft", publishedAt: null, strapiStatus: "draft" }),
  post({ id: 16, slug: "p-draft-cat", category: ref(6, "catdraft"), publishedAt: d("2026-01-15T00:00:00Z") }),
];
const missingPublishedAt = post({ id: 15, slug: "p-missing" });
delete missingPublishedAt.publishedAt;
posts.push(missingPublishedAt);

const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db("gc_test");
const counters = () => db.collection<{ _id: string; seq: number }>("counters");

describe("content data layer (gc_test)", () => {
  before(async () => {
    await client.connect();
    for (const name of COLLECTIONS) await db.collection(name).drop().catch(() => undefined);
    for (const name of ["post4s", "contact4s"]) {
      await db.collection(name).createIndex({ id: 1 }, { unique: true });
      await db.collection(name).createIndex({ documentId: 1 }, { unique: true });
    }
    await db.collection("category4s").insertMany(categories);
    await db.collection("author4s").insertMany(authors);
    await db.collection("post4s").insertMany(posts);
    await counters().updateOne({ _id: "contact4s" }, { $set: { seq: 100 } }, { upsert: true });
  });

  after(async () => {
    for (const name of COLLECTIONS) await db.collection(name).drop().catch(() => undefined);
    await counters().deleteOne({ _id: "contact4s" });
    await client.close();
    await (await mongo.getClient()).close();
  });

  it("lists only published articles, newest first, with populated relations", async () => {
    const list = await content.fetchArticles(24);
    assert.deepEqual(
      list.map((a) => a.slug),
      ["p-newest", "p-domains", "p-middle", "p-draft-cat", "p-oldest"],
    );
    const newest = list[0];
    assert.equal(newest.category?.name, "Web Hosting");
    assert.equal(newest.author?.name, "Alex Mercer");
    assert.equal(newest.featuredImage, "https://cdn.example/uploads/a.jpg");
    assert.equal(newest.featuredImageWidth, 1200);
    assert.deepEqual(newest.tags, ["hosting"]);
    assert.equal(newest.publishedAt, "2026-03-03T00:00:00.000Z");
    assert.equal(newest.updatedAt, "2026-03-04T00:00:00.000Z");
    assert.ok(newest.readingMinutes >= 1);
    assert.equal(list[1].author, null);
    assert.equal(list[1].category?.slug, "domains");
    assert.equal(list[3].category, null, "a draft-only category is not populated");
    assert.equal(list[4].updatedAt, list[4].publishedAt, "updatedAt is clamped to publishedAt");
    assert.equal((await content.fetchArticles(2)).length, 2);
  });

  it("finds a published article by slug and hides drafts", async () => {
    assert.equal((await content.fetchArticleBySlug("p-newest"))?.id, 10);
    assert.equal(await content.fetchArticleBySlug("p-draft"), null);
    assert.equal(await content.fetchArticleBySlug("p-missing"), null);
    assert.equal(await content.fetchArticleBySlug("nope"), null);
  });

  it("paginates a category like Strapi (page / pageSize / pageCount / total)", async () => {
    const page1 = await content.fetchArticlesByCategory("web-hosting", 1, 2);
    assert.equal(page1.total, 3);
    assert.equal(page1.pageCount, 2);
    assert.equal(page1.page, 1);
    assert.deepEqual(page1.items.map((a) => a.slug), ["p-newest", "p-middle"]);
    const page2 = await content.fetchArticlesByCategory("web-hosting", 2, 2);
    assert.deepEqual(page2.items.map((a) => a.slug), ["p-oldest"]);
    assert.equal(page2.page, 2);
    assert.deepEqual(await content.fetchArticlesByCategory("nope", 1, 10), { items: [], page: 1, pageCount: 0, total: 0 });
    assert.equal((await content.fetchArticlesByCategory("draft-cat", 1, 10)).total, 0);
    assert.deepEqual((await content.fetchLatestByCategory("domains", 4)).map((a) => a.slug), ["p-domains"]);
  });

  it("searches title and description case-insensitively with regex characters escaped", async () => {
    assert.deepEqual((await content.searchArticles("c++")).items.map((a) => a.slug), ["p-middle"]);
    assert.deepEqual((await content.searchArticles("shared")).items.map((a) => a.slug), ["p-middle"]);
    const none = await content.searchArticles("zzz-nothing");
    assert.equal(none.total, 0);
    assert.equal(none.pageCount, 0);
    const titles = await content.searchArticles("title", 1, 2);
    assert.equal(titles.total, 3);
    assert.equal(titles.pageCount, 2);
    assert.equal(titles.items.length, 2);
  });

  it("lists authors sorted by name and resolves author pages", async () => {
    const list = await content.fetchAuthors();
    assert.deepEqual(list.map((a) => a.name), ["Alex Mercer", "Sofia Ramos"]);
    assert.equal(list[1].avatarUrl, "https://cdn.example/uploads/sofia.jpg");
    assert.equal(list[1].role, null);
    assert.equal(list[1].bio, null);
    assert.equal((await content.fetchAuthorBySlug("alex-mercer"))?.role, "Hosting Writer");
    assert.equal(await content.fetchAuthorBySlug("nobody"), null);
    assert.deepEqual((await content.fetchArticlesByAuthor("alex-mercer")).map((a) => a.slug), ["p-newest", "p-draft-cat", "p-oldest"]);
    assert.deepEqual(await content.fetchArticlesByAuthor("nobody"), []);
  });

  it("fetchAllArticles returns every published article ($ne null excludes null and missing)", async () => {
    assert.equal((await content.fetchAllArticles()).length, 5);
  });

  it("stores contact submissions with the Strapi envelope and consecutive ids", async () => {
    const data = { name: "Test Person", email: "test@example.com", request: "Hello, this is a test message." };
    assert.equal(await content.submitContact(data), true);
    const doc = await db.collection("contact4s").findOne({ email: data.email });
    assert.ok(doc);
    assert.equal(doc.id, 101);
    assert.match(doc.documentId, /^[a-z0-9]{24}$/);
    assert.equal(doc.name, data.name);
    assert.equal(doc.request, data.request);
    assert.ok(doc.createdAt instanceof Date);
    assert.equal(doc.updatedAt.getTime(), doc.createdAt.getTime());
    assert.ok(doc.publishedAt instanceof Date);
    assert.equal("strapiStatus" in doc, false);

    assert.equal(await content.submitContact({ ...data, email: "second@example.com" }), true);
    assert.equal((await db.collection("contact4s").findOne({ email: "second@example.com" }))?.id, 102);
  });

  it("unique indexes replace Strapi's HTTP 400 on duplicates (E11000 → isDupKey)", async () => {
    await assert.rejects(
      db.collection("post4s").insertOne(post({ id: 10, slug: "dup-id" })),
      (err: unknown) => mongo.isDupKey(err),
    );
    assert.equal(mongo.isDupKey(new Error("boom")), false);
    assert.match(mongo.newDocumentId(), /^[a-z0-9]{24}$/);
    assert.notEqual(mongo.newDocumentId(), mongo.newDocumentId());
  });
});
