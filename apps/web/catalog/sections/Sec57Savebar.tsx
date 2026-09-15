"use client";

import { Grid } from "@/components/kit";
import { useState } from "react";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-57");

const initialName = "Acme marketing";

export function Sec57Savebar() {
  const [name, setName] = useState(initialName);
  const dirty = name !== initialName;

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <Grid columns={12}>
        <div className="kit-span-12 kit-card" style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 500 }}>
            Çalışma alanı adı
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          {dirty ? (
            <div className="kit-savebar">
              <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>Kaydedilmemiş değişiklikler</span>
              <span style={{ display: "flex", gap: 8 }}>
                <button type="button" className="kit-btn" onClick={() => setName(initialName)}>
                  Vazgeç
                </button>
                <button type="button" className="kit-btn kit-btn--primary" onClick={() => setName(name.trim() || initialName)}>
                  Kaydet
                </button>
              </span>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: "var(--fg-subtle)" }}>Değişiklik yok.</p>
          )}
        </div>
      </Grid>
    </SectionFrame>
  );
}
