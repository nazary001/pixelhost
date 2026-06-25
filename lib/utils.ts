import type { BlockNode } from "@/lib/types";

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function blocksToPlainText(blocks: BlockNode[] | null | undefined): string {
  if (!Array.isArray(blocks)) return "";
  const walk = (nodes: BlockNode[]): string =>
    nodes
      .map((node) => {
        if (typeof node.text === "string") return node.text;
        if (Array.isArray(node.children)) return walk(node.children);
        return "";
      })
      .join(" ");
  return walk(blocks).replace(/\s+/g, " ").trim();
}

export function readingMinutes(blocks: BlockNode[] | null | undefined): number {
  const words = blocksToPlainText(blocks).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/** Ordered list of h2 headings (id + text) for the table of contents. */
export function extractToc(blocks: BlockNode[]): { id: string; text: string }[] {
  return blocks
    .filter((b) => b.type === "heading" && (b.level ?? 2) === 2)
    .map((b) => {
      const text = blocksToPlainText([b]);
      return { id: slugify(text), text };
    })
    .filter((h) => h.id && h.text);
}

export function truncate(text: string, max = 160): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 40))}…`;
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
