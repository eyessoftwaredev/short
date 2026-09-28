import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/kit/icon";
import { Badge, Callout, CopyButton } from "@/components/ui";
import { cn } from "@/lib/cx";

/*
 * Building blocks for the /docs pages. Headings rendered through `DocsSection`
 * carry `data-docs-heading`, which is what the "On this page" index reads.
 */

const proseClasses =
  "flex min-w-0 flex-col gap-4 text-[15px] leading-7 text-fg-muted [&_a]:font-medium [&_code]:rounded-xs [&_code]:bg-surface [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-ink [&_h3]:m-0 [&_h3]:pt-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-ink [&_li]:pl-1 [&_ol]:m-0 [&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-2 [&_ol]:pl-5 [&_p]:m-0 [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:m-0 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5 marker:text-fg-subtle";

export function DocsProse({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(proseClasses, className)}>{children}</div>;
}

type DocsHeroProps = {
  eyebrow?: string;
  title: string;
  description: string;
  icon?: IconName;
};

export function DocsHero({ eyebrow, title, description, icon }: DocsHeroProps) {
  return (
    <header className="flex flex-col gap-3 border-b border-border-subtle pb-8">
      {eyebrow ? <p className="m-0 text-[13px] font-medium text-accent-ink">{eyebrow}</p> : null}
      <div className="flex min-w-0 items-center gap-3">
        {icon ? (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-surface text-accent-on-surface">
            <Icon name={icon} className="text-base" />
          </span>
        ) : null}
        <h1 className="m-0 text-3xl font-semibold tracking-tight text-ink">{title}</h1>
      </div>
      <p className="m-0 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-[17px]">{description}</p>
    </header>
  );
}

/** A titled chunk of a guide. The `id` doubles as the anchor and the index entry. */
export function DocsSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="flex min-w-0 scroll-mt-24 flex-col gap-4">
      <h2 data-docs-heading className="group m-0 flex items-center gap-2 text-xl font-semibold tracking-tight text-ink">
        {title}
        <a
          href={`#${id}`}
          aria-hidden="true"
          tabIndex={-1}
          className="text-sm text-fg-disabled opacity-0 no-underline transition-opacity group-hover:opacity-100 hover:text-accent-ink hover:no-underline"
        >
          #
        </a>
      </h2>
      {children}
    </section>
  );
}

type DocsCardProps = {
  title: string;
  description: string;
  href: string;
  icon: IconName;
};

export function DocsCard({ title, description, href, icon }: DocsCardProps) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-bg p-5 no-underline shadow-card transition-[border-color,box-shadow] hover:border-accent-border hover:no-underline hover:shadow-lift"
    >
      <span className="inline-flex size-9 items-center justify-center rounded-default bg-accent-surface text-accent-on-surface">
        <Icon name={icon} className="text-sm" />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">
          {title}
          <Icon
            name="arrow-right"
            className="text-[10px] text-fg-subtle opacity-0 transition-[opacity,transform] group-hover:translate-x-0.5 group-hover:opacity-100"
          />
        </span>
        <span className="text-sm leading-relaxed text-fg-muted">{description}</span>
      </span>
    </Link>
  );
}

type DocsCalloutProps = {
  title?: string;
  children: ReactNode;
  variant?: "info" | "tip" | "warn";
};

const calloutTone = { info: "info", tip: "accent", warn: "warn" } as const;
const calloutIcon = { info: "circle-info", tip: "bolt", warn: "warning" } as const;

export function DocsCallout({ title, children, variant = "info" }: DocsCalloutProps) {
  return (
    <Callout tone={calloutTone[variant]} icon={calloutIcon[variant]} title={title}>
      <div className="flex flex-col gap-1.5 leading-relaxed [&_a]:font-medium [&_code]:font-mono [&_code]:text-[12px] [&_p]:m-0">
        {children}
      </div>
    </Callout>
  );
}

export function DocsSteps({ children }: { children: ReactNode }) {
  return <ol className="m-0 flex list-none flex-col p-0">{children}</ol>;
}

type DocsStepProps = {
  index: number;
  title: string;
  children: ReactNode;
};

export function DocsStep({ index, title, children }: DocsStepProps) {
  return (
    <li className="relative flex gap-4 pb-8 last:pb-0 [&:last-child>span:first-child]:hidden">
      <span aria-hidden="true" className="absolute top-9 bottom-1 left-4 w-px bg-border" />
      <span className="numeric relative flex size-8 shrink-0 items-center justify-center rounded-pill border border-accent-border bg-accent-surface text-sm font-semibold text-accent-on-surface">
        {index}
      </span>
      <div className="flex min-w-0 flex-col gap-1.5 pt-1">
        <h3 className="m-0 text-base font-semibold text-ink">{title}</h3>
        <div className="text-[15px] leading-7 text-fg-muted [&_a]:font-medium [&_code]:rounded-xs [&_code]:bg-surface [&_code]:px-1 [&_code]:font-mono [&_code]:text-[13px] [&_p]:m-0">
          {children}
        </div>
      </div>
    </li>
  );
}

type DocsCodeBlockProps = {
  code: string;
  language?: string;
  /** Optional caption shown in the header instead of the language, e.g. a file name. */
  title?: string;
};

export function DocsCodeBlock({ code, language = "bash", title }: DocsCodeBlockProps) {
  return (
    <figure className="m-0 flex min-w-0 flex-col overflow-hidden rounded-lg border border-on-inverse-border bg-inverse">
      <figcaption className="flex items-center justify-between gap-2 border-b border-on-inverse-border py-1.5 pr-1.5 pl-4">
        <span className="font-mono text-xs text-on-inverse-dim">{title ?? language}</span>
        <CopyButton
          value={code}
          className="text-on-inverse-dim hover:bg-on-inverse-soft hover:text-on-inverse"
        />
      </figcaption>
      <pre className="m-0 overflow-x-auto px-4 py-3.5 font-mono text-[13px] leading-relaxed text-on-inverse">
        <code>{code}</code>
      </pre>
    </figure>
  );
}

type DocsEndpointProps = {
  method: string;
  path: string;
  summary: string;
  children?: ReactNode;
};

const methodTone: Record<string, "success" | "info" | "warn" | "danger"> = {
  get: "success",
  post: "info",
  patch: "warn",
  put: "warn",
  delete: "danger",
};

export function DocsEndpoint({ method, path, summary, children }: DocsEndpointProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 items-center gap-2.5 sm:w-[45%] sm:shrink-0">
        <Badge tone={methodTone[method.toLowerCase()] ?? "neutral"} size="sm" className="w-14 justify-center font-mono uppercase">
          {method}
        </Badge>
        <code className="min-w-0 truncate font-mono text-[13px] text-ink">{path}</code>
      </div>
      <p className="m-0 min-w-0 text-sm text-fg-muted">{summary}</p>
      {children}
    </div>
  );
}

export function DocsEndpointList({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col divide-y divide-border-subtle overflow-hidden rounded-lg border border-border bg-bg shadow-card">
      {children}
    </div>
  );
}

type DocsTableProps = {
  headers: string[];
  rows: ReactNode[][];
  /** Render the first column in monospace (event names, error codes, fields). */
  monoFirst?: boolean;
};

export function DocsTable({ headers, rows, monoFirst = false }: DocsTableProps) {
  return (
    <div className="relative min-w-0 overflow-x-auto rounded-lg border border-border bg-bg shadow-card">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-subtle">
            {headers.map((header) => (
              <th key={header} scope="col" className="px-4 py-2.5 text-[13px] font-medium whitespace-nowrap text-fg-subtle">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-border-subtle align-top last:border-0">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={cn(
                    "px-4 py-3 leading-relaxed",
                    cellIndex === 0
                      ? cn("font-medium whitespace-nowrap text-ink", monoFirst && "font-mono text-[13px] font-normal")
                      : "min-w-56 text-fg-muted",
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Previous / next guide links at the bottom of a page. */
export function DocsPager({
  prev,
  next,
  prevLabel,
  nextLabel,
}: {
  prev: { href: string; label: string } | null;
  next: { href: string; label: string } | null;
  prevLabel: string;
  nextLabel: string;
}) {
  if (!prev && !next) {
    return null;
  }
  return (
    <nav className="grid gap-3 border-t border-border-subtle pt-8 sm:grid-cols-2" aria-label={`${prevLabel} / ${nextLabel}`}>
      {prev ? (
        <Link
          href={prev.href}
          className="group flex flex-col gap-1 rounded-lg border border-border bg-bg p-4 no-underline hover:border-accent-border hover:no-underline"
        >
          <span className="flex items-center gap-1.5 text-xs text-fg-subtle">
            <Icon name="arrow-left" className="text-[10px]" />
            {prevLabel}
          </span>
          <span className="text-[15px] font-medium text-ink group-hover:text-accent-ink">{prev.label}</span>
        </Link>
      ) : (
        <span className="hidden sm:block" />
      )}
      {next ? (
        <Link
          href={next.href}
          className="group flex flex-col items-end gap-1 rounded-lg border border-border bg-bg p-4 text-right no-underline hover:border-accent-border hover:no-underline"
        >
          <span className="flex items-center gap-1.5 text-xs text-fg-subtle">
            {nextLabel}
            <Icon name="arrow-right" className="text-[10px]" />
          </span>
          <span className="text-[15px] font-medium text-ink group-hover:text-accent-ink">{next.label}</span>
        </Link>
      ) : null}
    </nav>
  );
}
