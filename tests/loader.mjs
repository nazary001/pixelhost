// Resolves the app's "@/…" alias and extension-less relative imports so the
// TypeScript data layer runs under `node --test` (type stripping) without a bundler.
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXTENSIONS = [".ts", ".tsx", ".mts", ".js", ".mjs"];

function withExtension(file) {
  if (existsSync(file) && statSync(file).isFile()) return file;
  for (const ext of EXTENSIONS) if (existsSync(file + ext)) return file + ext;
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const file = withExtension(path.join(ROOT, specifier.slice(2)));
    if (file) return nextResolve(pathToFileURL(file).href, context);
  } else if (/^\.\.?\//.test(specifier) && context.parentURL?.startsWith("file:")) {
    const file = withExtension(fileURLToPath(new URL(specifier, context.parentURL)));
    if (file) return nextResolve(pathToFileURL(file).href, context);
  }
  return nextResolve(specifier, context);
}
