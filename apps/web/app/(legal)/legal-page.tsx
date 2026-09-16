import type { ReactNode } from "react";
import { PublicChrome } from "@/components/landing/public-chrome";
import { getPlatformBrand } from "@/lib/brand";

export async function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  const brand = await getPlatformBrand();

  return (
    <PublicChrome>
      <article className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-6 px-6 py-16">
        <header className="flex min-w-0 flex-col gap-2">
          <p className="m-0 font-mono text-xs tracking-widest text-fg-subtle uppercase">{brand.name}</p>
          <h1 className="m-0 text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="m-0 text-sm text-fg-muted">Last updated {updated}</p>
        </header>
        <div className="legal-prose flex min-w-0 flex-col gap-4 text-sm leading-relaxed text-fg-muted">
          {children}
        </div>
      </article>
    </PublicChrome>
  );
}

export function LegalP({ children }: { children: ReactNode }) {
  return <p className="m-0">{children}</p>;
}

export function LegalH({ children }: { children: ReactNode }) {
  return <h2 className="m-0 mt-4 text-base font-semibold text-ink">{children}</h2>;
}
