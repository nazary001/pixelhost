"use client";

import { useEffect, useMemo, useState } from "react";

interface TocItem {
  id: string;
  text: string;
}

/** Anchor list of the article's h2 sections with scroll-spy highlighting. */
export default function TableOfContents({
  items,
  className = "",
}: {
  items: TocItem[];
  className?: string;
}) {
  const [activeId, setActiveId] = useState("");
  const key = useMemo(() => items.map((i) => i.id).join("|"), [items]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "0px 0px -75% 0px" },
    );
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (items.length < 2) return null;

  return (
    <nav aria-label="Table of contents" className={className}>
      <p className="tag-cap mb-3">On this page</p>
      <ul className="space-y-1 border-l border-line">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={`-ml-px block border-l-2 py-1 pl-3 text-sm leading-snug transition-colors ${
                activeId === item.id
                  ? "border-pine font-semibold text-pine"
                  : "border-transparent text-moss hover:border-line hover:text-ink"
              }`}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
