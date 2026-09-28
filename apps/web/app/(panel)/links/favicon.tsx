"use client";

import { useState } from "react";
import { Icon } from "@/components/kit/icon";
import { cn } from "@/lib/cx";
import { hostnameOf } from "./link-state";

type FaviconProps = {
  /** Page whose icon to show; its hostname is looked up. */
  url: string;
  /** An exact icon URL (e.g. from fetched metadata), tried before the lookup. */
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const BOX = { sm: "size-5 rounded-xs", md: "size-8 rounded-default", lg: "size-10 rounded-md" } as const;
const IMG = { sm: "size-3.5", md: "size-4", lg: "size-5" } as const;

/**
 * Site icon in a quiet tile. Uses Google's favicon service (the browser never talks to
 * the destination itself) and falls back to a globe when there is no icon.
 */
export function Favicon({ url, src, size = "md", className }: FaviconProps) {
  const host = hostnameOf(url);
  const lookup = host ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64` : null;
  const sources = [src, lookup].filter((value): value is string => typeof value === "string" && value !== "");
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const current = sources.find((candidate) => !failed.has(candidate)) ?? null;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden border border-border-subtle bg-surface text-fg-subtle",
        BOX[size],
        className,
      )}
    >
      {current ? (
        <img
          key={current}
          src={current}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className={cn("object-contain", IMG[size])}
          onError={() => setFailed((prev) => new Set(prev).add(current))}
        />
      ) : (
        <Icon name="globe" className={size === "sm" ? "text-[10px]" : "text-xs"} />
      )}
    </span>
  );
}
