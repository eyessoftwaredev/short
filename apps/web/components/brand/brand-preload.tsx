import type { BrandLockupSources } from "@/lib/brand-assets";

type BrandPreloadProps = {
  sources: BrandLockupSources;
  /** Preload wordmark in the header; skip for footer-only marks. */
  includeWordmark?: boolean;
};

export function BrandPreload({ sources, includeWordmark = true }: BrandPreloadProps) {
  return (
    <>
      <link rel="preload" as="image" href={sources.logoSrc} fetchPriority="high" />
      {includeWordmark && sources.wordmarkSrc ? (
        <link rel="preload" as="image" href={sources.wordmarkSrc} />
      ) : null}
    </>
  );
}
