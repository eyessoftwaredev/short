import type { ReactNode } from "react";
import { cn } from "@/lib/cx";

type HeroVariant = "default" | "compact" | "inverse";

type HeroProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  variant?: HeroVariant;
};

export function Hero({ eyebrow, title, description, actions, variant = "default" }: HeroProps) {
  return (
    <section
      className={cn(
        "flex flex-wrap items-start justify-between gap-5 rounded-default border bg-bg transition duration-200",
        variant === "default" && "border-border p-7",
        variant === "compact" && "border-border px-6 py-5",
        variant === "inverse" && "border-on-inverse-border bg-inverse p-7 text-on-inverse",
      )}
    >
      <div className="flex min-w-0 flex-col gap-2">
        {eyebrow ? (
          <span
            className={cn(
              "font-mono text-xs tracking-widest uppercase",
              variant === "inverse" ? "text-on-inverse-dim" : "text-fg-subtle",
            )}
          >
            {eyebrow}
          </span>
        ) : null}
        <h1
          className={cn(
            "m-0 font-semibold tracking-tight",
            variant === "compact" ? "text-2xl leading-tight" : "text-3xl leading-tight",
            variant === "inverse" && "text-on-inverse",
          )}
        >
          {title}
        </h1>
        {description ? (
          <p
            className={cn(
              "m-0 max-w-prose text-base leading-relaxed",
              variant === "inverse" ? "text-on-inverse-dim" : "text-fg-muted",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div> : null}
    </section>
  );
}
