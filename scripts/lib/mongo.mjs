// scripts/lib/mongo.mjs — plain-Node (ESM) transpile of lib/mongo.ts
// (source of truth: docs/strapi-to-mongo/templates/mongo.ts); same semantics.
// The Next.js app imports lib/mongo.ts; the generator scripts import this file.
import { MongoClient } from "mongodb";
import { randomBytes } from "node:crypto";

const DB_NAME = process.env.MONGODB_DB || "gc";

/** @returns {Promise<MongoClient>} cached across calls in the same process. */
export function getClient() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (!globalThis.__gcMongoClient) {
    const client = new MongoClient(uri, {
      maxPoolSize: Number(process.env.MONGODB_POOL || 10),
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
      appName: process.env.MONGODB_APP_NAME || "gc-app",
    });
    globalThis.__gcMongoClient = client.connect().catch((err) => {
      globalThis.__gcMongoClient = undefined;
      throw err;
    });
  }
  return globalThis.__gcMongoClient;
}

export async function getDb() {
  return (await getClient()).db(DB_NAME);
}

/** @param {string} name */
export async function coll(name) {
  return (await getDb()).collection(name);
}

/** Next Strapi-style numeric id for a collection (atomic counter). @param {string} collection */
export async function nextId(collection) {
  const db = await getDb();
  const r = await db
    .collection("counters")
    .findOneAndUpdate({ _id: collection }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  if (!r) throw new Error(`counters: no seq for ${collection}`);
  return r.seq;
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
/** Strapi v5-style documentId: 24 chars [a-z0-9]. */
export function newDocumentId() {
  const b = randomBytes(24);
  let s = "";
  for (let i = 0; i < 24; i++) s += ALPHABET[b[i] % 36];
  return s;
}

/** True when an insert/update hit a unique index (the old Strapi "unique → HTTP 400" branch). */
export function isDupKey(e) {
  return !!e && typeof e === "object" && e.code === 11000;
}

export function stamp(now = new Date()) {
  return { createdAt: now, updatedAt: now };
}

/**
 * Build a new document with Strapi-compatible envelope (id, documentId, timestamps).
 * `publish: true` sets publishedAt/strapiStatus for Draft&Publish collections.
 * @param {string} collection
 * @param {Record<string, unknown>} data
 * @param {{ publish?: boolean, now?: Date }} [opts]
 */
export async function newDoc(collection, data, opts = {}) {
  const now = opts.now ?? new Date();
  const doc = {
    id: await nextId(collection),
    documentId: newDocumentId(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  if (opts.publish !== undefined) {
    doc.publishedAt = opts.publish ? now : null;
    doc.strapiStatus = opts.publish ? "published" : "draft";
  }
  return doc;
}

/** Strip Mongo internals before sending a document to a browser. */
export function pub(doc) {
  if (!doc) return null;
  const { _id: _omit, ...rest } = doc;
  void _omit;
  return rest;
}
