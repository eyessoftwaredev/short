"use client";

import { Grid } from "@/components/kit";
import { useState } from "react";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-55");

export function Sec55Sheet() {
  const [side, setSide] = useState<"right" | "bottom">("right");
  const [open, setOpen] = useState(true);

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <Grid columns={12}>
        <div className="kit-span-12" style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="kit-btn" onClick={() => setSide("right")}>
              Sağ
            </button>
            <button type="button" className="kit-btn" onClick={() => setSide("bottom")}>
              Alt
            </button>
            <button type="button" className="kit-btn kit-btn--primary" onClick={() => setOpen((prev) => !prev)}>
              {open ? "Kapat" : "Aç"}
            </button>
          </div>
          <div className="kit-sheet-stage">
            <div style={{ padding: 20, color: "var(--fg-muted)", fontSize: 14 }}>Ana içerik — kayıt detayı sheet’te.</div>
            {open ? (
              <aside className={side === "right" ? "kit-sheet kit-sheet--right" : "kit-sheet kit-sheet--bottom"}>
                <div className="kit-sheet__head">
                  <strong>Kayıt detayı</strong>
                  <button type="button" className="kit-btn kit-btn--icon" aria-label="Close sheet" onClick={() => setOpen(false)}>
                    <i className="fa-solid fa-xmark" />
                  </button>
                </div>
                <div className="kit-sheet__body">Q4 onboarding · Merve Kaya · Aktif. Filtreler ve yan notlar burada durur.</div>
                <div className="kit-sheet__foot">
                  <button type="button" className="kit-btn">
                    İkincil
                  </button>
                  <button type="button" className="kit-btn kit-btn--primary">
                    Kaydet
                  </button>
                </div>
              </aside>
            ) : null}
          </div>
        </div>
      </Grid>
    </SectionFrame>
  );
}
