import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Info } from "lucide-react";
import { brandName } from "@/lib/nav";
import { cn } from "@/lib/cx";

export type AuthHighlight = {
  id: string;
  icon: ReactNode;
  title: string;
  body: string;
};

type AuthShellProps = {
  /** The promise this specific screen makes — login, register and reset each say something different. */
  railTitle: string;
  railBody: string;
  highlights: readonly AuthHighlight[];
  /** Escape hatch in the header for someone who landed on the wrong screen. */
  crossLink: { prompt: string; label: string; href: string };
  children: ReactNode;
};

function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-default font-mono text-sm font-semibold",
        className,
      )}
      aria-hidden="true"
    >
      S
    </span>
  );
}

export function AuthShell({
  railTitle,
  railBody,
  highlights,
  crossLink,
  children,
}: AuthShellProps) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-bg lg:grid-cols-5">
      <aside className="hidden min-w-0 flex-col justify-between gap-10 border-r border-on-inverse-border bg-inverse p-12 text-on-inverse lg:col-span-2 lg:flex">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2.5 text-on-inverse no-underline hover:no-underline"
        >
          <BrandMark className="bg-on-inverse-soft text-on-inverse" />
          <span className="text-base font-semibold tracking-tight">{brandName}</span>
        </Link>

        <div className="flex min-w-0 flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h2 className="m-0 text-3xl leading-tight font-semibold tracking-tight text-balance">
              {railTitle}
            </h2>
            <p className="m-0 max-w-prose text-base leading-relaxed text-on-inverse-dim">
              {railBody}
            </p>
          </div>

          <ul className="m-0 flex list-none flex-col gap-5 p-0">
            {highlights.map((item) => (
              <li key={item.id} className="flex min-w-0 items-start gap-3.5">
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-default bg-on-inverse-soft text-on-inverse"
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium">{item.title}</span>
                  <span className="text-sm leading-relaxed text-on-inverse-dim">{item.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Illustrative, not live data — it shows targeting, which is the thing worth signing up for. */}
        <div className="flex min-w-0 flex-col gap-3 rounded-default border border-on-inverse-border bg-on-inverse-soft p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-xs tracking-widest text-on-inverse-dim uppercase">
              One link, many destinations
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="shrink-0 font-mono text-sm">sho.rt/launch</span>
            <ArrowRight className="size-3.5 shrink-0 text-on-inverse-dim" aria-hidden="true" />
            <span className="min-w-0 truncate font-mono text-sm text-on-inverse-dim">
              acme.com/pricing
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["TR → /tr", "iOS → App Store", "Rest → /pricing"].map((rule) => (
              <span
                key={rule}
                className="rounded-pill border border-on-inverse-border px-2.5 py-1 font-mono text-xs text-on-inverse-dim"
              >
                {rule}
              </span>
            ))}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col lg:col-span-3">
        <header className="flex min-w-0 items-center justify-between gap-4 border-b border-border px-6 py-4 lg:justify-end lg:border-b-0 lg:px-10 lg:py-6">
          <Link
            href="/"
            className="inline-flex min-w-0 items-center gap-2.5 text-ink no-underline hover:no-underline lg:hidden"
          >
            <BrandMark className="bg-inverse text-on-inverse" />
            <span className="truncate text-base font-semibold tracking-tight">{brandName}</span>
          </Link>
          <p className="m-0 flex shrink-0 items-center gap-1.5 text-sm text-fg-muted">
            <span className="hidden sm:inline">{crossLink.prompt}</span>
            <Link href={crossLink.href} className="font-medium">
              {crossLink.label}
            </Link>
          </p>
        </header>

        <main className="flex min-w-0 flex-1 items-center justify-center px-6 py-10 lg:px-10 lg:py-6">
          <div className="flex w-full max-w-md min-w-0 flex-col gap-6">{children}</div>
        </main>

        <footer className="flex min-w-0 flex-wrap items-center justify-center gap-x-4 gap-y-1 px-6 py-6 text-xs text-fg-subtle lg:justify-end lg:px-10">
          <span>
            © {new Date().getFullYear()} {brandName}
          </span>
          <span aria-hidden="true">·</span>
          <span>Short links, QR codes and bio pages</span>
        </footer>
      </div>
    </div>
  );
}

type AuthHeadingProps = {
  title: string;
  description: string;
};

export function AuthHeading({ title, description }: AuthHeadingProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h1 className="m-0 text-3xl leading-tight font-semibold tracking-tight">{title}</h1>
      <p className="m-0 text-base leading-relaxed text-fg-muted">{description}</p>
    </div>
  );
}

type AuthAlertTone = "danger" | "accent" | "info";

const alertTone: Record<AuthAlertTone, { box: string; icon: string }> = {
  danger: { box: "border-danger bg-danger-surface", icon: "text-danger" },
  accent: { box: "border-accent bg-accent-tint", icon: "text-accent-ink" },
  info: { box: "border-border-strong bg-surface-subtle", icon: "text-fg-muted" },
};

const alertIcon: Record<AuthAlertTone, typeof AlertTriangle> = {
  danger: AlertTriangle,
  accent: CheckCircle2,
  info: Info,
};

type AuthAlertProps = {
  tone?: AuthAlertTone;
  title?: string;
  children: ReactNode;
};

export function AuthAlert({ tone = "danger", title, children }: AuthAlertProps) {
  const Icon = alertIcon[tone];
  return (
    <div
      role="alert"
      className={cn(
        "flex min-w-0 items-start gap-3 rounded-default border px-3.5 py-3",
        alertTone[tone].box,
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", alertTone[tone].icon)} aria-hidden="true" />
      <div className="min-w-0 text-sm">
        {title ? <p className="m-0 font-medium text-ink">{title}</p> : null}
        <p className={cn("m-0 text-fg-muted", title && "mt-0.5")}>{children}</p>
      </div>
    </div>
  );
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
      <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">{label}</span>
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
    </div>
  );
}
