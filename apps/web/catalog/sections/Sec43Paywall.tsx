"use client";

import { useState } from "react";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-43");

export function Sec43Paywall() {
  const [gateOpen, setGateOpen] = useState(false);

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div className="kit-paywall">
        <div className="kit-paywall__blur">
          <div style={{ fontSize: 22, fontWeight: 600 }}>Gelişmiş raporlar</div>
          <p style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.6, color: "var(--fg-muted)" }}>
            Kohort, huniler ve özel boyutlar Business planda açılır. Son 90 günün kırılımı burada durur.
          </p>
        </div>
        {!gateOpen ? (
          <div className="kit-paywall__gate">
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--accent-ink)",
              }}
            >
              Business
            </span>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Bu görünüm kilitli</div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--fg-muted)", maxWidth: "36ch" }}>
              Planı yükselt veya yöneticinden yetki iste.
            </p>
            <button
              type="button"
              style={{
                border: "1px solid var(--accent)",
                background: "var(--accent)",
                color: "var(--on-accent)",
                fontSize: 14,
                fontWeight: 500,
                padding: "10px 18px",
                borderRadius: "var(--radius)",
                cursor: "pointer",
              }}
              onClick={() => setGateOpen(true)}
            >
              Planı gör
            </button>
          </div>
        ) : null}
      </div>
    </SectionFrame>
  );
}
