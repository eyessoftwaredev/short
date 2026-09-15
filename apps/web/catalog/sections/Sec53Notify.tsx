"use client";

import { Grid } from "@/components/kit";
import opsData from "@/data/ops.json";
import { useState } from "react";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-53");

export function Sec53Notify() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(opsData.notifyPrefs);
  const unread = opsData.notifications.filter((item) => item.unread).length;

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <Grid columns={12}>
        <div className="kit-span-5 kit-card" style={{ minWidth: 0 }}>
          <div className="kit-notify">
            <button type="button" className="kit-btn" onClick={() => setOpen((prev) => !prev)} aria-expanded={open}>
              <i className="fa-solid fa-bell" /> Bildirimler
              {unread > 0 ? <span className="kit-badge" style={{ marginLeft: 8 }}>{unread}</span> : null}
            </button>
            {open ? (
              <div className="kit-notify__panel" role="dialog" aria-label="Notifications">
                {opsData.notifications.map((item) => (
                  <div key={item.id} className={item.unread ? "kit-notify__row kit-notify__row--unread" : "kit-notify__row"}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 500 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: "var(--fg-subtle)" }}>{item.body}</div>
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-disabled)" }}>
                      {item.when}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="kit-span-7 kit-card" style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <h3 className="kit-chart__title">Tercihler</h3>
          {prefs.map((pref) => (
            <label key={pref.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14 }}>
              <span>{pref.label}</span>
              <button
                type="button"
                className={pref.on ? "kit-btn kit-btn--sm kit-btn--primary" : "kit-btn kit-btn--sm"}
                aria-pressed={pref.on}
                onClick={() =>
                  setPrefs((prev) => prev.map((item) => (item.id === pref.id ? { ...item, on: !item.on } : item)))
                }
              >
                {pref.on ? "On" : "Off"}
              </button>
            </label>
          ))}
        </div>
      </Grid>
    </SectionFrame>
  );
}
