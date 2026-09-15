"use client";

import { Grid } from "@/components/kit";
import opsData from "@/data/ops.json";
import { useState } from "react";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-54");

export function Sec54Impersonate() {
  const [active, setActive] = useState(true);
  const copy = opsData.impersonation;

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <Grid columns={12}>
        <div className="kit-span-12" style={{ minWidth: 0 }}>
          {active ? (
            <div className="kit-impersonate" role="status">
              <span>
                {copy.actor} olarak değil — <strong>{copy.target}</strong> ({copy.role}) görünümü.
              </span>
              <button type="button" className="kit-btn kit-btn--sm" onClick={() => setActive(false)}>
                Oturumu bitir
              </button>
            </div>
          ) : (
            <div className="kit-card" style={{ color: "var(--fg-muted)", fontSize: 14 }}>
              Impersonation kapalı. Admin kendi görünümünde.
            </div>
          )}
        </div>
      </Grid>
    </SectionFrame>
  );
}
