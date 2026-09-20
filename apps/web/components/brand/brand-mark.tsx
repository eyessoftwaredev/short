"use client";

import Link from "next/link";
import { cn } from "@/lib/cx";

export type BrandLockupProps = {
  name: string;
  logoSrc: string;
  wordmarkSrc?: string;
  hasWordmark?: boolean;
  /** Inverse rail uses the light-on-dark mark when one is uploaded. */
  invert?: boolean;
  href?: string;
  wordmarkLazy?: boolean;
};

export function BrandMark({
  logoSrc,
  className,
  priority = false,
}: {
  logoSrc: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <span
      className={cn("relative flex h-8 w-8 shrink-0 items-center justify-center", className)}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- brand bytes are served from our API */}
      <img
        src={logoSrc}
        alt=""
        width={32}
        height={32}
        decoding="sync"
        fetchPriority={priority ? "high" : undefined}
        className="max-h-full max-w-full object-contain"
      />
    </span>
  );
}

function BrandWordmark({
  name,
  wordmarkSrc,
  hasWordmark = true,
  lazy = false,
}: {
  name: string;
  wordmarkSrc?: string;
  hasWordmark?: boolean;
  lazy?: boolean;
}) {
  if (!hasWordmark || !wordmarkSrc) {
    return <span className="truncate text-base font-semibold tracking-tight">{name}</span>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- brand bytes are served from our API
    <img
      src={wordmarkSrc}
      alt={name}
      width={176}
      height={24}
      decoding="sync"
      loading={lazy ? "lazy" : undefined}
      className="h-6 max-w-44 min-w-0 object-contain object-left"
    />
  );
}

export function BrandLockup({
  name,
  logoSrc,
  wordmarkSrc,
  hasWordmark = true,
  invert = false,
  href = "/",
  wordmarkLazy = false,
}: BrandLockupProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-w-0 items-center gap-2.5 no-underline hover:no-underline",
        invert ? "text-on-inverse" : "text-ink",
      )}
    >
      <BrandMark logoSrc={logoSrc} priority />
      <BrandWordmark
        name={name}
        wordmarkSrc={wordmarkSrc}
        hasWordmark={hasWordmark}
        lazy={wordmarkLazy}
      />
    </Link>
  );
}
