"use client";

import { useState } from "react";
import copyData from "@/data/copy.json";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-41");

type LocaleKey = keyof typeof copyData.localePreview;

export function Sec41Dil() {
  const [locale, setLocale] = useState<LocaleKey>("tr-TR");
  const [timezone, setTimezone] = useState("Europe/Istanbul");

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        <div className="kit-card">
          <label style={{ fontSize: 13, fontWeight: 500 }}>Dil</label>
          <select value={locale} onChange={(event) => setLocale(event.target.value as LocaleKey)}>
            <option value="tr-TR">Türkçe</option>
            <option value="en-US">English</option>
            <option value="de-DE">Deutsch</option>
          </select>
          <label style={{ fontSize: 13, fontWeight: 500 }}>Saat dilimi</label>
          <select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
            <option value="Europe/Istanbul">Europe/Istanbul</option>
            <option value="UTC">UTC</option>
            <option value="America/New_York">America/New_York</option>
          </select>
        </div>
        <div className="kit-card">
          <span className="kit-card__label">Önizleme</span>
          <span className="kit-card__value" style={{ fontSize: 22 }}>
            {copyData.localePreview[locale]}
          </span>
          <span className="kit-card__delta" style={{ color: "var(--fg-muted)" }}>
            {timezone}
          </span>
        </div>
      </div>
    </SectionFrame>
  );
}
