"use client";

import copyData from "@/data/copy.json";
import { Slider } from "@/components/kit";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-29");

export function Sec29Slider() {
  const announceSlides = copyData.announceSlides.map((slide) => (
    <div key={slide.title} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <strong style={{ fontSize: 15 }}>{slide.title}</strong>
      <span style={{ fontSize: 14, color: "var(--fg-muted)" }}>{slide.body}</span>
    </div>
  ));

  const cardSlides = copyData.cardSlides.map((slide) => (
    <article key={slide.label} className="kit-card">
      <span className="kit-card__label">{slide.label}</span>
      <span className="kit-card__value" style={{ fontSize: 22 }}>
        {slide.value}
      </span>
      <span className="kit-card__delta" style={{ color: "var(--fg-muted)" }}>
        {slide.body}
      </span>
    </article>
  ));

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >
        <Slider slides={announceSlides} ariaLabel="Duyuru karuseli" />
        <Slider slides={cardSlides} className="kit-slider--cards" ariaLabel="Kart karuseli" />
      </div>
    </SectionFrame>
  );
}
