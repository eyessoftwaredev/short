"use client";

import { useState } from "react";
import copyData from "@/data/copy.json";
import { cx } from "@/lib/cx";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-33");

export function Sec33Filtre() {
  const [filterChip, setFilterChip] = useState("Tümü");

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div className="kit-card">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {copyData.filterChips.map((label) => (
            <button
              key={label}
              type="button"
              className={cx("kit-chip", filterChip === label && "kit-chip--on")}
              onClick={() => setFilterChip(label)}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>
          Aktif: <strong style={{ color: "var(--ink)" }}>{filterChip}</strong> · 18 kayıt
        </div>
      </div>
    </SectionFrame>
  );
}
