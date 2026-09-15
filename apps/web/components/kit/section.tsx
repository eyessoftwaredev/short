import type { ReactNode } from "react";
import type { GridSpan } from "./types";

type SectionProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  span?: GridSpan;
  className?: string;
};

export function Section({
  title,
  description,
  actions,
  children,
  span,
  className,
}: SectionProps) {
  const sectionClass = [
    "kit-section",
    span ? `kit-span-${span}` : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={sectionClass}>
      <div className="kit-section__head">
        <div>
          <h2 className="kit-section__title">{title}</h2>
          {description ? <p className="kit-section__desc">{description}</p> : null}
        </div>
        {actions}
      </div>
      <div className="kit-section__body">{children}</div>
    </section>
  );
}
