"use client";

import { useState } from "react";
import boardData from "@/data/board.json";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-36");
const steps = boardData.onboarding.steps;

export function Sec36Onboarding() {
  const [step, setStep] = useState(0);
  const current = steps[step];

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div className="kit-hero kit-hero--live">
        <div className="kit-hero__body">
          <span className="kit-hero__eyebrow">
            Adım {step + 1} / {steps.length}
          </span>
          <h3 className="kit-hero__title">{current.title}</h3>
          <p className="kit-hero__desc">{current.body}</p>
        </div>
        <div className="kit-hero__actions">
          <button
            type="button"
            className="kit-btn"
            onClick={() => setStep((value) => Math.max(0, value - 1))}
          >
            Geri
          </button>
          <button
            type="button"
            className="kit-btn kit-btn--primary"
            onClick={() => setStep((value) => (value === steps.length - 1 ? 0 : value + 1))}
          >
            {step === steps.length - 1 ? "Bitir" : "İleri"}
          </button>
        </div>
      </div>
    </SectionFrame>
  );
}
