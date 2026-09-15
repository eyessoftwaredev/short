import type { ReactNode } from "react";

type SectionFrameProps = {
  id: string;
  heading: string;
  blurb: string;
  children: ReactNode;
};

export function SectionFrame({ id, heading, blurb, children }: SectionFrameProps) {
  return (
    <section id={id} className="kit-catalog-section" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 13,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--fg-subtle)",
          }}
        >
          {heading}
        </h2>
        <p style={{ margin: 0, fontSize: 15, color: "var(--fg-muted)" }}>{blurb}</p>
      </div>
      {children}
    </section>
  );
}
