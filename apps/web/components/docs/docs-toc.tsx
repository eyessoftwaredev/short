"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cx";

type Heading = { id: string; label: string };

/**
 * "On this page" index. Reads the `data-docs-heading` titles the page rendered
 * (see `DocsSection`) instead of duplicating them, and highlights the section
 * currently in view.
 */
export function DocsToc({ label, rootId }: { label: string; rootId: string }) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root) {
      return;
    }
    const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-docs-heading]"));
    const found = nodes
      .map((node) => {
        const section = node.closest("section[id]");
        const text = Array.from(node.childNodes)
          .filter((child) => child.nodeType === Node.TEXT_NODE)
          .map((child) => child.textContent ?? "")
          .join("")
          .trim();
        return section ? { id: section.id, label: text } : null;
      })
      .filter((entry): entry is Heading => entry !== null && entry.label !== "");
    setHeadings(found);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -65% 0px", threshold: 0 },
    );
    for (const entry of found) {
      const element = document.getElementById(entry.id);
      if (element) {
        observer.observe(element);
      }
    }
    return () => observer.disconnect();
  }, [rootId]);

  if (headings.length < 2) {
    return null;
  }

  return (
    <nav aria-label={label} className="flex flex-col gap-3">
      <p className="m-0 text-[13px] font-medium text-fg-subtle">{label}</p>
      <ol className="m-0 flex list-none flex-col border-l border-border p-0">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              aria-current={active === heading.id ? "location" : undefined}
              className={cn(
                "-ml-px block border-l py-1.5 pl-3 text-[13px] leading-snug no-underline hover:no-underline",
                active === heading.id
                  ? "border-accent font-medium text-accent-ink hover:text-accent-ink"
                  : "border-transparent text-fg-muted hover:border-border-hover hover:text-ink",
              )}
            >
              {heading.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
