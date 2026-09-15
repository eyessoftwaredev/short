"use client";

import { useState } from "react";
import { cx } from "@/lib/cx";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-39");

export function Sec39Dropzone() {
  const [dropName, setDropName] = useState("");

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <button
        type="button"
        className={cx("kit-dropzone", dropName && "kit-dropzone--active")}
        onClick={() => setDropName((value) => (value ? "" : "projeler-eylul.csv"))}
      >
        <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: 18, color: "var(--accent-ink)" }} />
        <span style={{ fontSize: 15, fontWeight: 500 }}>{dropName || "Dosyayı bırak veya seç"}</span>
        <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>CSV veya JSON · en fazla 10 MB</span>
      </button>
    </SectionFrame>
  );
}
