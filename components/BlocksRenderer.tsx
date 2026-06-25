import Image from "next/image";
import type { JSX, ReactNode } from "react";
import type { BlockNode } from "@/lib/types";
import { slugify } from "@/lib/utils";

function renderLeaf(node: BlockNode, key: number): ReactNode {
  let el: ReactNode = node.text ?? "";
  if (node.code) el = <code key={key}>{el}</code>;
  if (node.bold) el = <strong key={key}>{el}</strong>;
  if (node.italic) el = <em key={key}>{el}</em>;
  if (node.underline) el = <u key={key}>{el}</u>;
  if (node.strikethrough) el = <s key={key}>{el}</s>;
  return el;
}

function renderInline(nodes: BlockNode[] | undefined): ReactNode {
  if (!Array.isArray(nodes)) return null;
  return nodes.map((node, i) => {
    if (node.type === "link" && node.url) {
      const external = /^https?:\/\//.test(node.url);
      return (
        <a
          key={i}
          href={node.url}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {renderInline(node.children)}
        </a>
      );
    }
    return renderLeaf(node, i);
  });
}

function Block({ node }: { node: BlockNode }) {
  switch (node.type) {
    case "paragraph": {
      const inline = renderInline(node.children);
      return <p>{inline}</p>;
    }
    case "heading": {
      const level = Math.min(Math.max(node.level ?? 2, 2), 6);
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      const text = (node.children ?? [])
        .map((c) => c.text ?? "")
        .join("")
        .trim();
      // h2 headings get anchor ids so the table of contents can link to them
      const id = level === 2 && text ? slugify(text) : undefined;
      return <Tag id={id}>{renderInline(node.children)}</Tag>;
    }
    case "list": {
      const Tag = node.format === "ordered" ? "ol" : "ul";
      return (
        <Tag>
          {node.children?.map((item, i) => (
            <li key={i}>
              {item.type === "list" ? <Block node={item} /> : renderInline(item.children)}
            </li>
          ))}
        </Tag>
      );
    }
    case "quote":
      return <blockquote>{renderInline(node.children)}</blockquote>;
    case "code":
      return (
        <pre>
          <code>
            {node.children?.map((child) => child.text ?? "").join("\n")}
          </code>
        </pre>
      );
    case "image": {
      if (!node.image?.url) return null;
      return (
        <figure>
          <Image
            src={node.image.url}
            alt={node.image.alternativeText ?? ""}
            width={node.image.width ?? 1200}
            height={node.image.height ?? 675}
            sizes="(max-width: 768px) 100vw, 720px"
            className="h-auto w-full"
          />
        </figure>
      );
    }
    default:
      return null;
  }
}

export default function BlocksRenderer({ blocks }: { blocks: BlockNode[] }) {
  if (!Array.isArray(blocks) || blocks.length === 0) return null;
  return (
    <div className="article-body">
      {blocks.map((node, i) => (
        <Block key={i} node={node} />
      ))}
    </div>
  );
}
