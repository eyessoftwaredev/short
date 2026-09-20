import { Icon } from "@/components/kit/icon";
import { Badge, CopyButton } from "@/components/ui";
import { cn } from "@/lib/cx";
import Link from "next/link";
import type { ReactNode } from "react";

type DocsProseProps = {
  children: ReactNode;
  className?: string;
};

export function DocsProse({ children, className }: DocsProseProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-6 text-sm leading-relaxed text-fg-muted [&_h2]:m-0 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-ink [&_h3]:m-0 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-ink [&_ol]:m-0 [&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-2 [&_ol]:pl-5 [&_p]:m-0 [&_ul]:m-0 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

type DocsHeroProps = {
  eyebrow?: string;
  title: string;
  description: string;
};

export function DocsHero({ eyebrow, title, description }: DocsHeroProps) {
  return (
    <header className="flex flex-col gap-3 border-b border-border pb-8">
      {eyebrow ? (
        <p className="m-0 font-mono text-xs uppercase tracking-widest text-accent">{eyebrow}</p>
      ) : null}
      <h1 className="m-0 text-3xl font-semibold tracking-tight text-ink">{title}</h1>
      <p className="m-0 max-w-2xl text-base leading-relaxed text-fg-muted">{description}</p>
    </header>
  );
}

type DocsCardProps = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentProps<typeof Icon>["name"];
};

export function DocsCard({ title, description, href, icon }: DocsCardProps) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 flex-col gap-3 rounded-default border border-border bg-surface p-5 transition-colors hover:border-accent/40 hover:bg-surface-subtle"
    >
      <span className="inline-flex size-9 items-center justify-center rounded-default bg-accent/10 text-accent">
        <Icon name={icon} className="text-base" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-base font-semibold text-ink group-hover:text-accent">{title}</span>
        <span className="text-sm leading-relaxed text-fg-muted">{description}</span>
      </span>
    </Link>
  );
}

type DocsCalloutProps = {
  title: string;
  children: ReactNode;
  variant?: "info" | "tip";
};

export function DocsCallout({ title, children, variant = "info" }: DocsCalloutProps) {
  return (
    <aside
      className={cn(
        "flex gap-3 rounded-default border px-4 py-3",
        variant === "tip"
          ? "border-accent/30 bg-accent/5"
          : "border-border bg-surface-subtle",
      )}
    >
      <Icon
        name={variant === "tip" ? "bolt" : "circle-info"}
        className="mt-0.5 shrink-0 text-accent"
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="m-0 text-sm font-medium text-ink">{title}</p>
        <div className="text-sm leading-relaxed text-fg-muted">{children}</div>
      </div>
    </aside>
  );
}

type DocsStepProps = {
  index: number;
  title: string;
  children: ReactNode;
};

export function DocsStep({ index, title, children }: DocsStepProps) {
  return (
    <section className="flex gap-4">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/10 font-mono text-sm font-medium text-accent">
        {index}
      </span>
      <div className="flex min-w-0 flex-col gap-2">
        <h3 className="m-0 text-base font-semibold text-ink">{title}</h3>
        <div className="text-sm leading-relaxed text-fg-muted">{children}</div>
      </div>
    </section>
  );
}

type DocsCodeBlockProps = {
  code: string;
  language?: string;
};

export function DocsCodeBlock({ code, language = "bash" }: DocsCodeBlockProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2 overflow-hidden rounded-default border border-border bg-surface-subtle">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="font-mono text-xs uppercase tracking-wide text-fg-subtle">{language}</span>
        <CopyButton value={code} />
      </div>
      <pre className="m-0 overflow-x-auto px-3.5 py-3 font-mono text-xs leading-relaxed text-fg-muted">
        <code>{code}</code>
      </pre>
    </div>
  );
}

type DocsEndpointProps = {
  method: string;
  path: string;
  summary: string;
  children?: ReactNode;
};

const methodTone: Record<string, string> = {
  get: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  post: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  patch: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  delete: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export function DocsEndpoint({ method, path, summary, children }: DocsEndpointProps) {
  const tone = methodTone[method.toLowerCase()] ?? "bg-surface-subtle text-fg-muted";

  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-default border border-border bg-surface p-4">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Badge className={cn("font-mono uppercase", tone)}>{method}</Badge>
        <code className="min-w-0 truncate font-mono text-sm text-ink">{path}</code>
      </div>
      <p className="m-0 text-sm text-fg-muted">{summary}</p>
      {children}
    </article>
  );
}

type DocsTableProps = {
  headers: string[];
  rows: string[][];
};

export function DocsTable({ headers, rows }: DocsTableProps) {
  return (
    <div className="overflow-x-auto rounded-default border border-border">
      <table className="w-full min-w-max border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-subtle">
            {headers.map((header) => (
              <th key={header} className="px-4 py-2.5 font-medium text-ink">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-border last:border-0">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-2.5 text-fg-muted">
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
