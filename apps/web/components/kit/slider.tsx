"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

type SliderProps = {
  slides: ReactNode[];
  autoplayMs?: number;
  className?: string;
  ariaLabel?: string;
};

export function Slider({ slides, autoplayMs = 0, className, ariaLabel = "Carousel" }: SliderProps) {
  const [index, setIndex] = useState(0);
  const count = slides.length;

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex((next + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (!autoplayMs || count <= 1) return undefined;
    const timer = window.setInterval(() => goTo(index + 1), autoplayMs);
    return () => window.clearInterval(timer);
  }, [autoplayMs, count, goTo, index]);

  const rootClass = ["kit-slider", className].filter(Boolean).join(" ");

  return (
    <div className={rootClass}>
      <div
        className="kit-slider__viewport"
        tabIndex={0}
        aria-roledescription="carousel"
        aria-label={ariaLabel}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            goTo(index - 1);
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            goTo(index + 1);
          }
        }}
      >
        <div className="kit-slider__track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {slides.map((slide, slideIndex) => (
            <div key={slideIndex} className="kit-slider__slide">
              {slide}
            </div>
          ))}
        </div>
      </div>
      <div className="kit-slider__controls">
        <div className="kit-slider__dots" role="tablist">
          {slides.map((_, dotIndex) => (
            <button
              key={dotIndex}
              type="button"
              className={["kit-slider__dot", dotIndex === index ? "kit-slider__dot--active" : ""]
                .filter(Boolean)
                .join(" ")}
              aria-label={`Slide ${dotIndex + 1}`}
              aria-selected={dotIndex === index}
              onClick={() => goTo(dotIndex)}
            />
          ))}
        </div>
        <div className="kit-slider__nav">
          <button type="button" className="kit-slider__btn" aria-label="Previous slide" onClick={() => goTo(index - 1)}>
            ‹
          </button>
          <button type="button" className="kit-slider__btn" aria-label="Next slide" onClick={() => goTo(index + 1)}>
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
