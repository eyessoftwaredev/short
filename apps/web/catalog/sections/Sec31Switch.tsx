"use client";

import { useState } from "react";
import { cx } from "@/lib/cx";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-31");

export function Sec31Switch() {
  const [notifOn, setNotifOn] = useState(true);
  const [marketingOn, setMarketingOn] = useState(false);

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div className="kit-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Ürün bildirimleri</div>
              <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>Yorum ve atama e-postaları</div>
            </div>
            <button
              type="button"
              className={cx("kit-switch", notifOn && "kit-switch--on")}
              aria-pressed={notifOn}
              onClick={() => setNotifOn((value) => !value)}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Pazarlama</div>
              <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>Ürün duyurusu ve ipuçları</div>
            </div>
            <button
              type="button"
              className={cx("kit-switch", marketingOn && "kit-switch--on")}
              aria-pressed={marketingOn}
              onClick={() => setMarketingOn((value) => !value)}
            />
          </div>
        </div>
        <div className="kit-card">
          <span className="kit-card__label">Depolama</span>
          <span className="kit-card__value" style={{ fontSize: 22 }}>
            7.2 / 10 GB
          </span>
          <div className="kit-progress">
            <span style={{ width: "72%" }} />
          </div>
          <span className="kit-card__delta" style={{ color: "var(--fg-muted)" }}>
            %72 kullanıldı
          </span>
        </div>
        <div className="kit-card">
          <span className="kit-card__label">Atananlar</span>
          <div className="kit-avatar-stack">
            <span className="kit-avatar">MK</span>
            <span className="kit-avatar">AY</span>
            <span className="kit-avatar">SB</span>
            <span className="kit-avatar">+3</span>
          </div>
          <span className="kit-card__delta" style={{ color: "var(--fg-muted)" }}>
            6 kişi bu projede
          </span>
        </div>
      </div>
    </SectionFrame>
  );
}
