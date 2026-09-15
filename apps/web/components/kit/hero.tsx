import type { ReactNode } from "react";

type HeroVariant = "default" | "compact" | "inverse";

type HeroProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  variant?: HeroVariant;
};

export function Hero({ eyebrow, title, description, actions, variant = "default" }: HeroProps) {
  const className = [
    "kit-hero",
    variant === "compact" ? "kit-hero--compact" : "",
    variant === "inverse" ? "kit-hero--inverse" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={className}>
      <div className="kit-hero__body">
        {eyebrow ? <span className="kit-hero__eyebrow">{eyebrow}</span> : null}
        <h1 className="kit-hero__title">{title}</h1>
        {description ? <p className="kit-hero__desc">{description}</p> : null}
      </div>
      {actions ? <div className="kit-hero__actions">{actions}</div> : null}
    </section>
  );
}
