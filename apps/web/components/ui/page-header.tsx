import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/kit/icon";
import { cn } from "@/lib/cx";

export type Crumb = { label: ReactNode; href?: string };

type BreadcrumbsProps = {
  items: readonly Crumb[];
  /** Accessible name of the trail. */
  label?: string;
  className?: string;
};

/** Inline trail: Links / launch-campaign / Stats. The last item is the current page. */
export function Breadcrumbs({ items, label, className }: BreadcrumbsProps) {
  const t = useTranslations("common");
  if (items.length === 0) {
    return null;
  }
  return (
    <nav aria-label={label ?? t("breadcrumb")} className={cn("min-w-0", className)}>
      <ol className="m-0 flex min-w-0 list-none flex-wrap items-center gap-1.5 p-0 text-[13px] leading-5">
        {items.map((crumb, index) => {
          const last = index === items.length - 1;
          return (
            <li key={index} className="flex min-w-0 items-center gap-1.5">
              {index > 0 ? (
                <Icon name="chevron-right" className="text-[9px] text-fg-faint" />
              ) : null}
              {crumb.href && !last ? (
                <Link
                  href={crumb.href}
                  className="max-w-48 truncate text-fg-muted no-underline hover:text-ink hover:no-underline"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className={cn("max-w-64 truncate", last ? "font-medium text-ink" : "text-fg-muted")}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

type PageHeaderProps = {
  title: ReactNode;
  /** One or two plain sentences: what this page is for. */
  description?: ReactNode;
  /** Small line above the title, e.g. the plan or the record type. */
  eyebrow?: ReactNode;
  /** Trail above the title — an array of crumbs, or any node. */
  breadcrumbs?: readonly Crumb[] | ReactNode;
  /** "← Links" link above the title for detail pages. */
  back?: { href: string; label: ReactNode };
  /** Kit icon shown in a soft tile left of the title. */
  icon?: IconName;
  /** Inline next to the title: a status Badge, a count. */
  meta?: ReactNode;
  /** The page's ONE primary action (right-aligned). Usually a primary Button. */
  actions?: ReactNode;
  /** Secondary actions, rendered left of `actions` (export, import, menus). */
  secondaryActions?: ReactNode;
  /** Tab row under the header — `<TabLinks>` or `<Tabs>`. */
  tabs?: ReactNode;
  className?: string;
};

/**
 * The top of every panel page: title, description, primary action top-right,
 * optional breadcrumbs and tabs. Sits directly on the canvas — no box.
 *
 *   <PageHeader title="Links" description="Every short link in this workspace."
 *     actions={<Button variant="primary" leadingIcon="plus" href="/links/new">New link</Button>}
 *     secondaryActions={<Button leadingIcon="download">Export</Button>} />
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  breadcrumbs,
  back,
  icon,
  meta,
  actions,
  secondaryActions,
  tabs,
  className,
}: PageHeaderProps) {
  const trail = Array.isArray(breadcrumbs) ? (
    <Breadcrumbs items={breadcrumbs as readonly Crumb[]} />
  ) : (
    (breadcrumbs as ReactNode)
  );

  return (
    <header className={cn("flex min-w-0 flex-col gap-4", tabs && "gap-5", className)}>
      {back || trail ? (
        <div className="flex min-w-0 flex-col gap-2">
          {back ? (
            <Link
              href={back.href}
              className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-fg-muted no-underline hover:text-ink hover:no-underline"
            >
              <Icon name="arrow-left" className="text-[11px]" />
              {back.label}
            </Link>
          ) : null}
          {trail}
        </div>
      ) : null}

      <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 flex-1 basis-80 items-start gap-3.5">
          {icon ? (
            <span
              className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-bg text-fg-muted shadow-xs"
              aria-hidden="true"
            >
              <Icon name={icon} className="text-base" />
            </span>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {eyebrow ? (
              <span className="text-[13px] leading-5 font-medium text-fg-subtle">{eyebrow}</span>
            ) : null}
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 className="m-0 min-w-0 text-2xl leading-8 font-semibold tracking-[-0.02em] break-words text-ink">
                {title}
              </h1>
              {meta ? <div className="flex shrink-0 items-center gap-2">{meta}</div> : null}
            </div>
            {description ? (
              <p className="m-0 max-w-3xl text-sm leading-6 text-fg-muted">{description}</p>
            ) : null}
          </div>
        </div>

        {actions || secondaryActions ? (
          <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">
            {secondaryActions}
            {actions}
          </div>
        ) : null}
      </div>

      {tabs ? <div className="min-w-0">{tabs}</div> : null}
    </header>
  );
}
