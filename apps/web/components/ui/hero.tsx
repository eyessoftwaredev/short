import type { ReactNode } from "react";
import { cn } from "@/lib/cx";
import { PageHeader } from "./page-header";

type HeroVariant = "default" | "compact" | "inverse";

type HeroProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  variant?: HeroVariant;
};

/**
 * @deprecated Use `PageHeader` for page tops (it adds breadcrumbs, secondary
 * actions, meta and tabs). `default` and `compact` now render exactly like a
 * `PageHeader`; `inverse` keeps the dark promotional block.
 */
export function Hero({ eyebrow, title, description, actions, variant = "default" }: HeroProps) {
  if (variant !== "inverse") {
    return <PageHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />;
  }

  return (
    <section
      className={cn(
        "flex flex-wrap items-start justify-between gap-5 rounded-lg border border-on-inverse-border bg-inverse p-7 text-on-inverse shadow-card",
      )}
    >
      <div className="flex min-w-0 flex-col gap-2">
        {eyebrow ? (
          <span className="text-[13px] font-medium text-on-inverse-dim">{eyebrow}</span>
        ) : null}
        <h1 className="m-0 text-3xl leading-tight font-semibold tracking-[-0.02em] text-on-inverse">
          {title}
        </h1>
        {description ? (
          <p className="m-0 max-w-prose text-base leading-relaxed text-on-inverse-dim">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div> : null}
    </section>
  );
}
